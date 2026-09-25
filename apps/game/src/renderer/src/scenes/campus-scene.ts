import type Phaser from 'phaser'
import {
  createPlayer,
  ensurePlayerAnimations,
  feetBoxAt,
  movePlayer,
  preloadPlayer,
  rectsOverlap,
} from './player.js'

const PLAYER_SPEED = 220
const RETURN_POSITION_KEY = 'campus:returnTo'

/** One flattened Tiled object: `properties` turned from the raw array into a plain map. */
type FlatObject = {
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  properties: Record<string, string | number | boolean>
}

function flatten(object: Phaser.Types.Tilemaps.TiledObject): FlatObject {
  const properties: Record<string, string | number | boolean> = {}
  for (const property of (object.properties ?? []) as { name: string; value: unknown }[]) {
    properties[property.name] = property.value as string | number | boolean
  }
  return {
    name: object.name,
    type: object.type,
    x: object.x ?? 0,
    y: object.y ?? 0,
    width: object.width ?? 0,
    height: object.height ?? 0,
    properties,
  }
}

const OBJECT_ASSETS = [
  'house_large',
  'house_large_alt',
  'house_small',
  'house_small_alt',
  'hospital',
  'gate_pillar',
]

export type CampusScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
    update: (this: Phaser.Scene) => void
  }
}

/**
 * The campus, drawn from the real generated map (ADR 0058): ground as tiles, buildings and
 * the lagoa as plain objects — never tiles, since Phaser's Tiled parser has no "Collection
 * of Images" support and a building is one whole stamp, not a grid of them. Walking onto a
 * building enters its own scene; the graph itself is extracted separately, by
 * `@unifor-quest/campus`, wherever a quest needs it — this scene only draws the map.
 */
export function createCampusScene(): CampusScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let buildings: FlatObject[] = []
  let nearBuilding: FlatObject | undefined

  return {
    config: {
      key: 'campus',

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON('campus', 'maps/campus.tmj')
        this.load.image('world', 'tilesets/world.png')
        for (const asset of OBJECT_ASSETS) {
          this.load.image(asset, `objects/${asset}.png`)
        }
        preloadPlayer(this)
      },

      create(this: Phaser.Scene) {
        const map = this.add.tilemap('campus')
        const tileset = map.addTilesetImage('world', 'world')
        if (tileset !== null) {
          map.createLayer('ground', tileset)
        }

        const layer = map.getObjectLayer('buildings')
        buildings = []

        for (const raw of layer?.objects ?? []) {
          const object = flatten(raw)

          if (object.type === 'shape') {
            const graphics = this.add.graphics()
            const color = Number(`0x${String(object.properties['color']).replace('#', '')}`)
            graphics.fillStyle(color, 1)
            if (object.properties['kind'] === 'ellipse') {
              graphics.fillEllipse(
                object.x + object.width / 2,
                object.y + object.height / 2,
                object.width,
                object.height,
              )
            } else {
              graphics.fillRect(object.x, object.y, object.width, object.height)
            }
            continue
          }

          if (object.type === 'building') {
            const asset = String(object.properties['asset'])
            this.add
              .image(object.x, object.y, asset)
              .setOrigin(0, 0)
              .setDisplaySize(object.width, object.height)

            // Gates are landmarks, not places with a name worth reading on the map.
            if (object.name !== 'Entrada') {
              this.add
                .text(object.x + object.width / 2, object.y - 2, object.name, {
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#1d1f2b',
                  backgroundColor: '#e8e8f0cc',
                  padding: { x: 3, y: 1 },
                })
                .setOrigin(0.5, 1)
            }

            buildings.push(object)
          }
        }

        // Returning from a building's interior lands back at its door; otherwise spawn
        // between the entrance gates, not at the map's geometric centre (which happens to
        // sit inside a building's own footprint).
        const returnPosition = this.registry.get(RETURN_POSITION_KEY) as
          | { x: number; y: number }
          | undefined
        this.registry.remove(RETURN_POSITION_KEY)

        const gates = buildings.filter((building) => building.name === 'Entrada')
        const gateSpawn =
          gates.length > 0
            ? {
                x: gates.reduce((sum, gate) => sum + gate.x + gate.width / 2, 0) / gates.length,
                y:
                  gates.reduce((sum, gate) => sum + gate.y + gate.height / 2, 0) / gates.length +
                  64,
              }
            : { x: map.widthInPixels / 2, y: map.heightInPixels / 2 }

        const spawn = returnPosition ?? gateSpawn

        ensurePlayerAnimations(this)
        player = createPlayer(this, spawn.x, spawn.y)

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        this.cameras.main.startFollow(player)

        cursors = this.input.keyboard?.createCursorKeys()

        const hint = this.add
          .text(8, 8, 'Setas para andar. E perto de um predio para entrar.', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#e8e8f0',
          })
          .setScrollFactor(0)

        this.input.keyboard?.on('keydown-E', () => {
          if (nearBuilding === undefined || player === undefined) {
            return
          }
          const buildingId = String(nearBuilding.properties['buildingId'])
          // Only the Biblioteca has an interior scene so far (ADR 0058's proof); the rest
          // are the next batch, once this pipeline is reviewed.
          if (buildingId === 'biblioteca') {
            this.registry.set(RETURN_POSITION_KEY, { x: player.x, y: player.y })
            this.scene.start('biblioteca')
          }
        })
        this.input.keyboard?.on('keydown-M', () => this.scene.start('world'))

        this.events.once('shutdown', () => hint.destroy())
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) {
          return
        }

        const prevX = player.x
        const prevY = player.y

        movePlayer(player, cursors, PLAYER_SPEED, this.game.loop.delta / 1000)

        const newX = player.x
        const newY = player.y
        const blocked = (x: number, y: number) => {
          const box = feetBoxAt(x, y)
          return buildings.some((building) => rectsOverlap(box, building))
        }

        if (blocked(newX, newY)) {
          if (!blocked(newX, prevY)) {
            player.y = prevY
          } else if (!blocked(prevX, newY)) {
            player.x = prevX
          } else {
            player.x = prevX
            player.y = prevY
          }
        }

        const { x: playerX, y: playerY } = player

        nearBuilding = buildings.find((building) => {
          const cx = building.x + building.width / 2
          const cy = building.y + building.height / 2
          return (
            Math.hypot(playerX - cx, playerY - cy) <
            Math.max(building.width, building.height) / 2 + 32
          )
        })
      },
    },
  }
}
