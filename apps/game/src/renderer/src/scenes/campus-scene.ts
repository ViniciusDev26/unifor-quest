import {
  type DialogueLine,
  type Progress,
  type Requirements,
  requirementsMet,
} from '@unifor-quest/core'
import type Phaser from 'phaser'
import { z } from 'zod'
import { playMusic, playSfx, preloadAudio } from '../audio/music.js'
import { frameRoom } from './camera.js'
import { type CutscenePlayer, createCutscenePlayer } from './cutscene-player.js'
import { createDialogueBox } from './dialogue-box.js'
import { type CutsceneHost, PLAYER_ACTOR } from './interior-scene.js'
import { preloadNpcSprite } from './npc.js'
import { createPauseMenu, preloadPauseMenuAudio } from './pause-menu.js'
import {
  clampToRoom,
  createPlayer,
  ensurePlayerAnimations,
  feetBoxAt,
  movePlayer,
  preloadPlayer,
  rectsOverlap,
} from './player.js'
import { type TiledPropertyValue, tiledPropertiesSchema } from './tiled-properties.js'

const PLAYER_SPEED = 220
const RETURN_POSITION_KEY = 'campus:returnTo'
const KEY = 'campus'
/** The campus with NULL in the system, and without it (ADR 0070). */
const MUSIC_KEY = 'campus-theme'
const NULL_MUSIC_KEY = 'campus-null-theme'
const GLITCH_SFX_KEYS = ['campus-glitch-1', 'campus-glitch-2'] as const
/** NULL's green over the whole campus, and how often it flickers. */
const NULL_TINT = 0x39ff6a
const NULL_TINT_ALPHA = 0.07
const GLITCH_EVERY_MS = { min: 6000, max: 11000 }

/** What `RETURN_POSITION_KEY` holds: the registry hands back `any`, so it is checked (ADR 0017). */
const returnPositionSchema = z.object({ x: z.number(), y: z.number() }).optional()

/** One flattened Tiled object: `properties` turned from the raw array into a plain map. */
type FlatObject = {
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  properties: Record<string, TiledPropertyValue>
}

function flatten(object: Phaser.Types.Tilemaps.TiledObject): FlatObject {
  const properties: FlatObject['properties'] = {}
  for (const property of tiledPropertiesSchema.parse(object.properties ?? [])) {
    properties[property.name] = property.value
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

/**
 * A building's door, opened with E nearby (ADR 0074). Which doors exist and what each one
 * waits for is content that `main.ts` hands over: this scene never names a flag.
 */
export type CampusDoor = {
  /** Key of the scene behind the door. */
  scene: string
  /** Left out, the door is always open. */
  lock?: {
    requires: Requirements
    /** Shown instead of entering while `requires` does not hold. */
    lines: readonly DialogueLine[]
  }
}

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
 *
 * No NPC ever stands here: they live inside a scenario, the entrance gates included (ADR
 * 0059) — this scene only tries the door of the building the player is next to. `progress`
 * is what that door gets checked against (ADR 0074).
 */
export function createCampusScene(options: {
  doors: Readonly<Record<string, CampusDoor>>
  progress: () => Progress
  /** True once NULL is gone: the music goes back to `town` and the green filter lifts
   * (ADR 0070). Read when the scene is created — the campus is never on screen as it flips. */
  restored: () => boolean
  cutscenes: CutsceneHost
  /** Who a cutscene may bring in, by actor id: a 4x4 walk sheet, like an NPC's. */
  actors?: Readonly<Record<string, string>>
}): CampusScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let buildings: FlatObject[] = []
  let nearBuilding: FlatObject | undefined
  let cutscenePlayer: CutscenePlayer | undefined
  let mapWidth = 0
  let mapHeight = 0

  return {
    config: {
      key: KEY,

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON('campus', 'maps/campus.tmj')
        this.load.image('city', 'tilesets/city.png')
        for (const asset of OBJECT_ASSETS) {
          this.load.image(asset, `objects/${asset}.png`)
        }
        preloadPlayer(this)
        preloadAudio(this, MUSIC_KEY, 'audio/music/rpgchip03_town.ogg')
        preloadAudio(this, NULL_MUSIC_KEY, 'audio/music/rpgchip02_bittersweet_story.ogg')
        preloadAudio(this, GLITCH_SFX_KEYS[0], 'audio/sfx/interface/glitch_001.ogg')
        preloadAudio(this, GLITCH_SFX_KEYS[1], 'audio/sfx/interface/glitch_002.ogg')
        for (const [actor, path] of Object.entries(options.actors ?? {})) {
          preloadNpcSprite(this, actorKey(actor), path)
        }
        preloadPauseMenuAudio(this)
      },

      create(this: Phaser.Scene) {
        const restored = options.restored()
        playMusic(this, restored ? MUSIC_KEY : NULL_MUSIC_KEY)

        const map = this.add.tilemap('campus')
        const tileset = map.addTilesetImage('city', 'city')
        if (tileset !== null) {
          map.createLayer('ground', tileset)
        }
        mapWidth = map.widthInPixels
        mapHeight = map.heightInPixels

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
        const returnPosition = returnPositionSchema.parse(this.registry.get(RETURN_POSITION_KEY))
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
        const spawned = createPlayer(this, spawn.x, spawn.y)
        player = spawned

        frameRoom(this, map.widthInPixels, map.heightInPixels, player)

        cursors = this.input.keyboard?.createCursorKeys()
        const dialogueBox = createDialogueBox(this)
        const pauseMenu = createPauseMenu(this, { isBlocked: () => dialogueBox.active })

        if (!restored) {
          tintWithNull(this, map.widthInPixels, map.heightInPixels)
        }

        // The epilogue plays here (ADR 0076): the campus back to normal, Davi at the door
        // of the Bloco de Tecnologia, and then the credits.
        const cutscenes = createCutscenePlayer(this, {
          cast: {
            onStage: new Map([[PLAYER_ACTOR, spawned]]),
            offstage: Object.fromEntries(
              Object.keys(options.actors ?? {}).map((actor) => [actor, actorKey(actor)]),
            ),
          },
          cues: {
            // `done` first: the cutscene is marked seen before this scene stops.
            creditos: (scene, done) => {
              done()
              scene.scene.start('creditos')
            },
          },
          dialogueBox,
        })
        cutscenePlayer = cutscenes

        const hint = this.add
          .text(8, 8, 'Setas para andar. E perto de um predio para entrar.', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#e8e8f0',
          })
          .setScrollFactor(0)
          // Above NULL's green (depth 500), which covers the map, not the HUD.
          .setDepth(1000)

        this.input.keyboard?.on('keydown-E', () => {
          // Not while paused: leaving would keep this scene's clock stopped for good, and the
          // dialogue box needs it, so the line of the next locked door could never be closed.
          if (dialogueBox.active || pauseMenu.active || cutscenes.active) {
            return
          }
          if (nearBuilding === undefined || player === undefined) {
            return
          }
          const buildingId = String(nearBuilding.properties['buildingId'])
          const door = options.doors[buildingId]
          if (door === undefined) {
            return
          }
          if (door.lock !== undefined && !requirementsMet(door.lock.requires, options.progress())) {
            dialogueBox.show(door.lock.lines, () => {})
            return
          }
          // `scene.start` with an unknown key stops this scene and starts nothing: a black
          // screen. An interior that does not exist yet just leaves its door shut (ADR 0074).
          if (this.scene.manager.keys[door.scene] === undefined) {
            return
          }
          this.registry.set(RETURN_POSITION_KEY, { x: player.x, y: player.y })
          this.scene.start(door.scene)
        })

        this.events.once('shutdown', () => {
          hint.destroy()
          cutscenePlayer = undefined
        })

        const due = options.cutscenes.pending(KEY)
        if (due !== undefined) {
          options.cutscenes.onStart()
          hint.setVisible(false)
          cutscenes.play(due, () => options.cutscenes.onEnd(due))
        }
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) {
          return
        }
        if (cutscenePlayer?.active === true) {
          return
        }

        const prevX = player.x
        const prevY = player.y

        movePlayer(player, cursors, PLAYER_SPEED, this.game.loop.delta / 1000)
        clampToRoom(player, mapWidth, mapHeight, 0)

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

function actorKey(actor: string): string {
  return `actor-${actor}`
}

/**
 * NULL's hold on the campus (ADR 0070): a light green over the whole map and, every few
 * seconds, a flicker with one of the `glitch` sounds. Drawn in world space, over the map
 * and under the dialogue box and the pause menu.
 */
function tintWithNull(scene: Phaser.Scene, width: number, height: number): void {
  const tint = scene.add
    .rectangle(0, 0, width, height, NULL_TINT)
    .setOrigin(0, 0)
    .setAlpha(NULL_TINT_ALPHA)
    .setDepth(500)

  const scheduleGlitch = (): void => {
    const delay = Math.floor(
      GLITCH_EVERY_MS.min + Math.random() * (GLITCH_EVERY_MS.max - GLITCH_EVERY_MS.min),
    )
    scene.time.delayedCall(delay, () => {
      const sound = GLITCH_SFX_KEYS[Math.floor(Math.random() * GLITCH_SFX_KEYS.length)]
      if (sound !== undefined) {
        playSfx(scene, sound, 0.25)
      }
      scene.tweens.add({
        targets: tint,
        alpha: NULL_TINT_ALPHA * 3,
        duration: 90,
        yoyo: true,
        repeat: 2,
        onComplete: () => tint.setAlpha(NULL_TINT_ALPHA),
      })
      scheduleGlitch()
    })
  }
  scheduleGlitch()
}
