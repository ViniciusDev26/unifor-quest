import {
  type DialogueLine,
  type Progress,
  type Requirements,
  requirementsMet,
} from '@unifor-quest/core'
import type Phaser from 'phaser'
import { z } from 'zod'
import { playMusic, playSfx, preloadAudio } from '../audio/music.js'
import { playLoadedSfx, playStep, preloadWorldSfx, SFX } from '../audio/sfx.js'
import { frameRoom } from './camera.js'
import {
  CAMPUS_DOORS,
  CAMPUS_ENTRANCES,
  CAMPUS_PROPS,
  CAMPUS_SIZE,
} from './campus-assets.generated.js'
import { type CutscenePlayer, createCutscenePlayer } from './cutscene-player.js'
import { createDialogueBox } from './dialogue-box.js'
import { type CutsceneHost, type Furniture, PLAYER_ACTOR, readShapes } from './interior-scene.js'
import { preloadNpcSprite } from './npc.js'
import { createPauseMenu, preloadPauseMenuAudio } from './pause-menu.js'
import {
  createPlayer,
  ensurePlayerAnimations,
  feetBoxAt,
  movePlayer,
  preloadPlayer,
  type Rect,
  rectsOverlap,
} from './player.js'
import { type TiledPropertyValue, tiledPropertiesSchema } from './tiled-properties.js'

const PLAYER_SPEED = 190
/** Where the player stands when the campus starts again, set by whoever sends them there. */
export const RETURN_POSITION_KEY = 'campus:returnTo'
const KEY = 'campus'
const TILE = 16
/** The campus with NULL in the system, and without it (ADR 0070). */
const MUSIC_KEY = 'campus-theme'
const NULL_MUSIC_KEY = 'campus-null-theme'
const GLITCH_SFX_KEYS = ['campus-glitch-1', 'campus-glitch-2'] as const
/** NULL's green over the whole campus, and how often it flickers. */
const NULL_TINT = 0x39ff6a
const NULL_TINT_ALPHA = 0.07
const GLITCH_EVERY_MS = { min: 6000, max: 11000 }
/** How close to a door's point E opens it. */
const DOOR_DISTANCE = 38
/** Above every prop (100 + their bottom edge), under the pause menu and the dialogue box. */
const TINT_DEPTH = 1800
const HUD_DEPTH = 1950
/** The screens beside the two locked doors: NULL until the campus is restored (ADR 0070). */
const SCREENS = ['tela-centro-de-convivencia', 'tela-bloco-de-tecnologia'] as const

/** What `RETURN_POSITION_KEY` holds: the registry hands back `any`, so it is checked (ADR 0017). */
const returnPositionSchema = z.object({ x: z.number(), y: z.number() }).optional()

/** A story building's solid base and the id its door is keyed by (content/campus-doors.ts). */
type Building = Rect & { buildingId: string; name: string }

function readBuildings(map: Phaser.Tilemaps.Tilemap): Building[] {
  const buildings: Building[] = []
  for (const object of map.getObjectLayer('buildings')?.objects ?? []) {
    if (object.type !== 'building') {
      continue
    }
    const properties: Record<string, TiledPropertyValue> = {}
    for (const property of tiledPropertiesSchema.parse(object.properties ?? [])) {
      properties[property.name] = property.value
    }
    buildings.push({
      buildingId: String(properties['buildingId']),
      name: object.name,
      x: object.x ?? 0,
      y: object.y ?? 0,
      width: object.width ?? 0,
      height: object.height ?? 0,
    })
  }
  return buildings
}

function hitsShape(feet: Rect, shape: Furniture): boolean {
  if (!rectsOverlap(feet, shape)) return false
  if (shape.kind === 'rect') return true
  const rx = shape.width / 2
  const ry = shape.height / 2
  if (rx <= 0 || ry <= 0) return false
  const closestX = Math.max(feet.x, Math.min(shape.x + rx, feet.x + feet.width))
  const closestY = Math.max(feet.y, Math.min(shape.y + ry, feet.y + feet.height))
  return ((closestX - shape.x - rx) / rx) ** 2 + ((closestY - shape.y - ry) / ry) ** 2 < 1
}

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
 * The campus, drawn like the interiors (ADR 0075, 0080): one ground image and every
 * building, tree, bench and lamp as its own sprite, sorted by where it touches the ground,
 * under a 2x camera that follows the player. Collision comes from the generated map: the
 * hidden ground layer says where one can walk, the story buildings are `building` objects
 * and every other solid is a `shape`. The graph is read separately, by
 * `@unifor-quest/campus`, wherever a quest needs it.
 *
 * No NPC ever stands here: they live inside a scenario (ADR 0059). A door opens with E at
 * its point in front of the facade, and `progress` is what it is checked against (ADR 0074).
 */
export function createCampusScene(options: {
  doors: Readonly<Record<string, CampusDoor>>
  progress: () => Progress
  /** True once NULL is gone: the music goes back to `town`, the green filter lifts and the
   * screens by the doors show OK (ADR 0070). Read when the scene is created. */
  restored: () => boolean
  cutscenes: CutsceneHost
  /** Who a cutscene may bring in, by actor id: a 4x4 walk sheet, like an NPC's. */
  actors?: Readonly<Record<string, string>>
}): CampusScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let playerShadow: Phaser.GameObjects.Ellipse | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let buildings: Building[] = []
  let shapes: Furniture[] = []
  let insideGround: (x: number, y: number) => boolean = () => false
  let nearDoor: (typeof CAMPUS_DOORS)[number] | undefined
  let cutscenePlayer: CutscenePlayer | undefined
  let hint: Phaser.GameObjects.Text | undefined
  let overviewActive = false
  let busy = (): boolean => false
  let lastStepAt = 0

  const nameOf = (buildingId: string): string =>
    buildings.find((building) => building.buildingId === buildingId)?.name ?? buildingId

  return {
    config: {
      key: KEY,

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON(KEY, `maps/${KEY}.tmj`)
        this.load.image('indoor', 'tilesets/indoor.png')
        this.load.image('campus-ground', 'scene-art/campus-ground.png')
        this.load.image('campus-overview', 'scene-art/campus-overview.png')
        const textures = new Set<string>(CAMPUS_PROPS.map((prop) => prop.texture))
        for (const screen of SCREENS) textures.add(`${screen}-ok`)
        for (const texture of textures) {
          this.load.image(`campus-prop-${texture}`, `scene-art/campus-props/${texture}.png`)
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
        preloadWorldSfx(this)
      },

      create(this: Phaser.Scene) {
        const restored = options.restored()
        playMusic(this, restored ? MUSIC_KEY : NULL_MUSIC_KEY)

        const map = this.add.tilemap(KEY)
        const tileset = map.addTilesetImage('indoor', 'indoor')
        const groundLayer = tileset === null ? null : map.createLayer('ground', tileset)
        groundLayer?.setVisible(false)
        const { width: mapWidth, height: mapHeight } = CAMPUS_SIZE
        insideGround = (x, y) => {
          if (groundLayer === null || x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
            return false
          }
          const tile = groundLayer.getTileAt(Math.floor(x / TILE), Math.floor(y / TILE))
          return tile !== null && tile.index >= 0
        }

        this.add.image(0, 0, 'campus-ground').setOrigin(0, 0).setDepth(-20)
        for (const prop of CAMPUS_PROPS) {
          const screen = SCREENS.find((id) => id === prop.id)
          const texture = screen !== undefined && restored ? `${screen}-ok` : prop.texture
          this.add
            .image(prop.x, prop.y, `campus-prop-${texture}`)
            .setOrigin(0, 0)
            .setDepth(100 + prop.depthY)
        }
        buildings = readBuildings(map)
        shapes = readShapes(map)

        const collisionDebug = this.add
          .graphics()
          .setDepth(TINT_DEPTH + 1)
          .setVisible(false)
        collisionDebug.lineStyle(2, 0xffde82, 0.95)
        for (const solid of [...buildings, ...shapes]) {
          if ('kind' in solid && solid.kind === 'ellipse') {
            collisionDebug.strokeEllipse(
              solid.x + solid.width / 2,
              solid.y + solid.height / 2,
              solid.width,
              solid.height,
            )
          } else {
            collisionDebug.strokeRect(solid.x, solid.y, solid.width, solid.height)
          }
        }
        this.input.keyboard?.on('keydown-F3', () =>
          collisionDebug.setVisible(!collisionDebug.visible),
        )

        // Back from a building, the player stands at its door; otherwise (the game starting
        // here, or leaving the portaria for the first time) at the gatehouse's.
        const returnPosition = returnPositionSchema.parse(this.registry.get(RETURN_POSITION_KEY))
        this.registry.remove(RETURN_POSITION_KEY)
        const spawn = returnPosition ?? CAMPUS_ENTRANCES.portaria

        ensurePlayerAnimations(this)
        const spawned = createPlayer(this, spawn.x, spawn.y)
        player = spawned
        playerShadow = this.add.ellipse(spawn.x, spawn.y + 13, 20, 8, 0x27354a, 0.32)
        sortByGround(spawned, playerShadow)

        // A whole-number zoom, as in the interiors (ADR 0075): every art pixel an exact 2x2.
        this.cameras.main.setZoom(2)
        this.cameras.main.roundPixels = true
        frameRoom(this, mapWidth, mapHeight, spawned)

        cursors = this.input.keyboard?.createCursorKeys()
        const dialogueBox = createDialogueBox(this)

        if (!restored) {
          tintWithNull(this, mapWidth, mapHeight)
        }

        const heading = this.add
          .text(12, 10, 'CAMPUS UNIFOR', {
            fontFamily: 'monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#1e3550ed',
            padding: { x: 9, y: 7 },
          })
          .setScrollFactor(0)
          .setDepth(HUD_DEPTH)
        const controls = this.add
          .text(12, 44, 'SETAS: andar   E: entrar   M: mapa   F3: colisões   ESC: pausa', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#e4f1ff',
            backgroundColor: '#1e3550e8',
            padding: { x: 8, y: 5 },
          })
          .setScrollFactor(0)
          .setDepth(HUD_DEPTH)
        const doorHint = this.add
          .text(this.scale.width / 2, this.scale.height - 24, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#1a304ce8',
            padding: { x: 14, y: 8 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(HUD_DEPTH)
          .setVisible(false)
        hint = doorHint

        const overview = createOverview(this, mapWidth, mapHeight)
        const pauseMenu = createPauseMenu(this, {
          isBlocked: () => dialogueBox.active || overviewActive,
        })

        // Screen-space HUD under a zoomed camera: zoom scales around the viewport centre, so
        // position and scale are inverted around it, as in the interiors.
        const fixHud = (): void => {
          const z = this.cameras.main.zoom || 1
          const midX = this.cameras.main.width / 2
          const midY = this.cameras.main.height / 2
          const place = (item: Phaser.GameObjects.Text, x: number, y: number): void => {
            item.setPosition(midX + (x - midX) / z, midY + (y - midY) / z).setScale(1 / z)
          }
          place(heading, 12, 10)
          place(controls, 12, 44)
          place(doorHint, this.scale.width / 2, this.scale.height - 24)
          overview.container.setPosition(midX * (1 - 1 / z), midY * (1 - 1 / z)).setScale(1 / z)
        }
        fixHud()
        this.scale.on('resize', fixHud)
        this.events.once('shutdown', () => this.scale.off('resize', fixHud))

        // The epilogue plays here (ADR 0076): the campus back to normal, Davi at the door of
        // the Bloco de Tecnologia, and then the credits.
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
          // Actors are sorted by their feet, like the player and every prop.
          depthOf: groundDepth,
        })
        cutscenePlayer = cutscenes
        busy = () => dialogueBox.active || pauseMenu.active || cutscenes.active || overviewActive

        this.input.keyboard?.on('keydown-M', () => {
          if (dialogueBox.active || pauseMenu.active || cutscenes.active) return
          overviewActive = !overviewActive
          overview.show(overviewActive, spawned)
          doorHint.setVisible(false)
        })

        this.input.keyboard?.on('keydown-E', () => {
          // Not while paused: leaving would keep this scene's clock stopped for good, and the
          // dialogue box needs it, so the line of the next locked door could never be closed.
          if (busy() || nearDoor === undefined) {
            return
          }
          const door = options.doors[nearDoor.buildingId]
          if (door === undefined) {
            return
          }
          if (door.lock !== undefined && !requirementsMet(door.lock.requires, options.progress())) {
            // A rattle of a door that does not give.
            playLoadedSfx(this, SFX.doorClose, 0.35)
            dialogueBox.show(door.lock.lines, () => {})
            return
          }
          // `scene.start` with an unknown key stops this scene and starts nothing: a black
          // screen. An interior that does not exist yet just leaves its door shut (ADR 0074).
          if (this.scene.manager.keys[door.scene] === undefined) {
            return
          }
          this.registry.set(RETURN_POSITION_KEY, CAMPUS_ENTRANCES[nearDoor.buildingId])
          playLoadedSfx(
            this,
            door.scene === 'bloco-de-tecnologia' ? SFX.techDoorOpen : SFX.doorOpen,
            0.5,
          )
          this.scene.start(door.scene)
        })

        this.events.once('shutdown', () => {
          cutscenePlayer = undefined
          player = undefined
          playerShadow = undefined
          hint = undefined
          nearDoor = undefined
          overviewActive = false
          busy = () => false
        })

        const due = options.cutscenes.pending(KEY)
        if (due !== undefined) {
          options.cutscenes.onStart()
          cutscenes.play(due, () => options.cutscenes.onEnd(due))
        }
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) {
          return
        }
        if (busy()) {
          if (cutscenePlayer?.active !== true) player.anims.stop()
          if (cutscenePlayer?.active === true) {
            sortByGround(player, playerShadow)
          }
          hint?.setVisible(false)
          return
        }

        const oldX = player.x
        const oldY = player.y
        movePlayer(player, cursors, PLAYER_SPEED, Math.min(this.game.loop.delta, 45) / 1000)
        const dx = player.x - oldX
        const dy = player.y - oldY
        player.setPosition(oldX, oldY)
        const blocked = (x: number, y: number): boolean => {
          const feet = feetBoxAt(x, y)
          const corners: readonly (readonly [number, number])[] = [
            [feet.x, feet.y],
            [feet.x + feet.width, feet.y],
            [feet.x, feet.y + feet.height],
            [feet.x + feet.width, feet.y + feet.height],
          ]
          return (
            corners.some(([px, py]) => !insideGround(px, py)) ||
            buildings.some((building) => rectsOverlap(feet, building)) ||
            shapes.some((shape) => hitsShape(feet, shape))
          )
        }
        // Small substeps on each axis: the player slides along walls and round tree trunks.
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 3))
        for (let i = 0; i < steps; i++) {
          const nx = player.x + dx / steps
          const ny = player.y + dy / steps
          if (!blocked(nx, player.y)) player.x = nx
          if (!blocked(player.x, ny)) player.y = ny
        }
        sortByGround(player, playerShadow)
        if (
          Math.hypot(player.x - oldX, player.y - oldY) > 0.4 &&
          this.time.now - lastStepAt > 230
        ) {
          lastStepAt = this.time.now
          playStep(this)
        }

        const { x, y } = player
        nearDoor = CAMPUS_DOORS.find(
          (door) => Math.hypot(x - door.x, y + 12 - door.y) < DOOR_DISTANCE,
        )
        const door = nearDoor === undefined ? undefined : options.doors[nearDoor.buildingId]
        if (nearDoor === undefined || door === undefined) {
          hint?.setVisible(false)
          return
        }
        const locked =
          door.lock !== undefined && !requirementsMet(door.lock.requires, options.progress())
        hint
          ?.setText(`E  ${locked ? 'PORTA TRAVADA: ' : 'ENTRAR: '}${nameOf(nearDoor.buildingId)}`)
          .setVisible(true)
      },
    },
  }
}

/** Depth by where the feet touch the ground, the same rule as every prop's (100 + bottom). */
function groundDepth(sprite: Phaser.GameObjects.Sprite): number {
  return 100 + sprite.y + 16
}

function sortByGround(
  sprite: Phaser.GameObjects.Sprite,
  shadow: Phaser.GameObjects.Ellipse | undefined,
): void {
  sprite.setDepth(groundDepth(sprite))
  shadow?.setPosition(sprite.x, sprite.y + 13).setDepth(100 + sprite.y + 12)
}

/**
 * The M map: the whole campus, pre-shrunk by the generator, with the name of each building
 * and a dot where the player is.
 */
function createOverview(
  scene: Phaser.Scene,
  mapWidth: number,
  mapHeight: number,
): {
  container: Phaser.GameObjects.Container
  show: (visible: boolean, player: Phaser.GameObjects.Sprite) => void
} {
  const width = scene.scale.width
  const height = scene.scale.height
  const zoom = Math.min((width - 80) / mapWidth, (height - 85) / mapHeight)
  const toScreen = (x: number, y: number): { x: number; y: number } => ({
    x: width / 2 + (x - mapWidth / 2) * zoom,
    y: height / 2 + 9 + (y - mapHeight / 2) * zoom,
  })
  const container = scene.add.container(0, 0).setScrollFactor(0).setDepth(2100).setVisible(false)
  container.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x061521, 0.93))
  container.add(
    scene.add
      .image(width / 2, height / 2 + 9, 'campus-overview')
      .setDisplaySize(Math.round(mapWidth * zoom), Math.round(mapHeight * zoom)),
  )
  for (const prop of CAMPUS_PROPS) {
    const label = OVERVIEW_LABELS[prop.id]
    if (label === undefined) continue
    const at = toScreen(prop.x + prop.width / 2, prop.y + 10)
    container.add(
      scene.add
        .text(at.x, at.y, label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#24508fe8',
          padding: { x: 3, y: 2 },
        })
        .setOrigin(0.5, 1),
    )
  }
  const dot = scene.add.circle(width / 2, height / 2, 5, 0xffea96).setStrokeStyle(2, 0x203f63)
  container.add(dot)
  container.add(
    scene.add
      .text(width / 2, 14, 'MAPA DO CAMPUS', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#172a42e8',
        padding: { x: 7, y: 6 },
      })
      .setOrigin(0.5, 0),
  )
  container.add(
    scene.add
      .text(width / 2, height - 12, 'PRESSIONE M PARA VOLTAR', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#172a42ef',
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0.5, 1),
  )
  return {
    container,
    show: (visible, player) => {
      const at = toScreen(player.x, player.y)
      dot.setPosition(at.x, at.y)
      container.setVisible(visible)
    },
  }
}

/** The name over each story building on the M map, by its prop id. */
const OVERVIEW_LABELS: Readonly<Record<string, string>> = {
  portaria: 'Portaria',
  biblioteca: 'Biblioteca',
  'centro-de-convivencia': 'Centro de\nConvivência',
  auditorio: 'Auditório',
  'bloco-de-tecnologia': 'Bloco de\nTecnologia',
  'centro-esportivo': 'Centro\nEsportivo',
}

function actorKey(actor: string): string {
  return `actor-${actor}`
}

/**
 * NULL's hold on the campus (ADR 0070): a light green over the whole map and, every few
 * seconds, a flicker with one of the `glitch` sounds. Drawn in world space, over the map
 * and under the HUD, the dialogue box and the pause menu.
 */
function tintWithNull(scene: Phaser.Scene, width: number, height: number): void {
  const tint = scene.add
    .rectangle(0, 0, width, height, NULL_TINT)
    .setOrigin(0, 0)
    .setAlpha(NULL_TINT_ALPHA)
    .setDepth(TINT_DEPTH)

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
