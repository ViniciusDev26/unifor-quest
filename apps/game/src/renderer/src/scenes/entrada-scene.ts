import type { DialogueLine } from '@unifor-quest/core'
import type Phaser from 'phaser'
import { playMusic, playSfx, preloadAudio } from '../audio/music.js'
import { playLoadedSfx, playStep, preloadWorldSfx, SFX } from '../audio/sfx.js'
import { frameRoom } from './camera.js'
import { type Cue, type CutscenePlayer, createCutscenePlayer } from './cutscene-player.js'
import { createDialogueBox } from './dialogue-box.js'
import {
  type Conversation,
  type CutsceneHost,
  type Furniture,
  PLAYER_ACTOR,
  readShapes,
  type TakeSuccessDialogue,
} from './interior-scene.js'
import { createNpc, npcBox, preloadNpcSprite } from './npc.js'
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
import {
  PORTARIA_EXIT,
  PORTARIA_MARCOS,
  PORTARIA_PROPS,
  PORTARIA_SIZE,
  PORTARIA_SPAWN,
  PORTARIA_TALK,
} from './portaria-assets.generated.js'

const KEY = 'entrada'
// The campus' calm theme (ADR 0062): the portaria and the campus share the "before
// everything changed" tone.
const MUSIC = 'campus-theme'
const GLITCH_SFX = 'portaria-glitch'
const NOISE_SFX = 'portaria-noise'
const TILE = 16
const SPEED = 172
const TALK_DISTANCE = 46
const EXIT_DISTANCE = 52
const MARCOS_KEY = 'npc-Marcos'
const DAVI_KEY = 'actor-davi'
const SCREENS = ['tela-1', 'tela-2'] as const
const PANEL = 'painel'

/** What the portaria shows depends on the world, not on the room (ADR 0070). */
export type PortariaWorld = {
  /** The wall screens show NULL: after the opening, until the campus is restored. */
  screensDark: () => boolean
  /** The sign panel is gibberish: after Davi's reset, until the cipher is solved. */
  signScrambled: () => boolean
}

export type EntradaScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
    update: (this: Phaser.Scene) => void
  }
  /** Call after `progress` changes: redraws the screens and the panel and plays the
   * cutscene now due, if this room is on screen (ADR 0066). */
  progressChanged: () => void
}

const texture = (id: string): string => `portaria-prop-${id}`

/**
 * The entrance guardhouse, Marcos's booth (ADR 0059), drawn like the other rooms (ADR 0075,
 * 0087): one floor image and every piece of furniture as its own sprite, sorted by where it
 * touches the floor, under a 2x camera. The game starts here (0061): the player leaves for
 * the campus through the door only once "Placas embaralhadas" sets `minimapa-liberado`.
 *
 * The opening cutscene plays here (ADR 0066): Davi is its actor, and the wall screens and
 * the sign panel are what its cues act on — each has a picture for every state the story
 * puts it in, and the scene swaps them.
 */
export function createEntradaScene(options: {
  onTalkToNpc: (npcId: string) => Conversation | undefined
  canLeave: () => boolean
  cutscenes: CutsceneHost
  world: PortariaWorld
  /** Marcos's reaction once the cipher's editor closes (ADR 0089). */
  takeSuccessDialogue?: TakeSuccessDialogue
  /** The 4x4 walk sheets of Marcos and of Davi (the opening's actor). */
  sprites?: { marcos: string; davi: string }
}): EntradaScene {
  const sheets = options.sprites ?? {
    marcos: 'characters/marcos.png',
    davi: 'characters/davi.png',
  }
  let player: Phaser.GameObjects.Sprite | undefined
  let playerShadow: Phaser.GameObjects.Ellipse | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let furniture: Furniture[] = []
  let obstacles: Rect[] = []
  let insideFloor: (x: number, y: number) => boolean = () => false
  let hint: Phaser.GameObjects.Text | undefined
  let cutscenePlayer: CutscenePlayer | undefined
  let nearMarcos = false
  let nearExit = false
  let lastStepAt = 0
  let busy = (): boolean => false
  let refresh = (): void => {}
  let startPendingCutscene = (): void => {}
  let playSuccess = (_lines: readonly DialogueLine[]): void => {}
  let celebrating = false
  let onScreen = false

  return {
    config: {
      key: KEY,

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON(KEY, `maps/${KEY}.tmj`)
        this.load.image('indoor', 'tilesets/indoor.png')
        this.load.image('portaria-ground', 'scene-art/portaria-ground.png')
        const textures = new Set<string>(PORTARIA_PROPS.map((prop) => prop.id))
        for (const screen of SCREENS) textures.add(`${screen}-null`)
        textures.add(`${PANEL}-noise`)
        textures.add(`${PANEL}-scrambled`)
        for (const id of textures) {
          this.load.image(texture(id), `scene-art/portaria-props/${id}.png`)
        }
        preloadPlayer(this)
        preloadNpcSprite(this, MARCOS_KEY, sheets.marcos)
        preloadNpcSprite(this, DAVI_KEY, sheets.davi)
        preloadAudio(this, MUSIC, 'audio/music/rpgchip03_town.ogg')
        preloadAudio(this, GLITCH_SFX, 'audio/sfx/interface/glitch_001.ogg')
        preloadAudio(this, NOISE_SFX, 'audio/sfx/scifi/computerNoise_000.ogg')
        preloadWorldSfx(this)
        preloadPauseMenuAudio(this)
      },

      create(this: Phaser.Scene) {
        playMusic(this, MUSIC)
        const map = this.add.tilemap(KEY)
        const tileset = map.addTilesetImage('indoor', 'indoor')
        const floorLayer = tileset === null ? null : map.createLayer('ground', tileset)
        floorLayer?.setVisible(false)
        const { width: mapWidth, height: mapHeight } = PORTARIA_SIZE
        insideFloor = (x, y) => {
          if (floorLayer === null || x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
            return false
          }
          const tile = floorLayer.getTileAt(Math.floor(x / TILE), Math.floor(y / TILE))
          return tile !== null && tile.index >= 0
        }

        this.add.image(0, 0, 'portaria-ground').setOrigin(0, 0).setDepth(-20)
        const images = new Map<string, Phaser.GameObjects.Image>()
        for (const prop of PORTARIA_PROPS) {
          images.set(
            prop.id,
            this.add
              .image(prop.x, prop.y, texture(prop.id))
              .setOrigin(0, 0)
              .setDepth(100 + prop.depthY),
          )
        }

        const setScreens = (dark: boolean): void => {
          for (const screen of SCREENS) {
            images.get(screen)?.setTexture(texture(dark ? `${screen}-null` : screen))
          }
        }
        const setPanel = (state: 'ok' | 'noise' | 'scrambled'): void => {
          images.get(PANEL)?.setTexture(texture(state === 'ok' ? PANEL : `${PANEL}-${state}`))
        }
        refresh = () => {
          setScreens(options.world.screensDark())
          setPanel(options.world.signScrambled() ? 'scrambled' : 'ok')
        }
        refresh()

        // Marcos stands at the left end of his desk (scripts/render-portaria-pixel-art.py).
        const marcos = createNpc(this, MARCOS_KEY, PORTARIA_MARCOS.x, PORTARIA_MARCOS.y)
        marcos.sprite.setDepth(100 + PORTARIA_MARCOS.y + 16)
        furniture = readShapes(map)
        obstacles = [npcBox(marcos)]

        ensurePlayerAnimations(this)
        const spawned = createPlayer(this, PORTARIA_SPAWN.x, PORTARIA_SPAWN.y)
        player = spawned
        playerShadow = this.add.ellipse(spawned.x, spawned.y + 13, 20, 8, 0x27354a, 0.32)
        sortByGround(spawned, playerShadow)

        // A whole-number zoom, as in the other rooms (ADR 0075).
        this.cameras.main.setZoom(2)
        this.cameras.main.roundPixels = true
        frameRoom(this, mapWidth, mapHeight, spawned)

        const dialogueBox = createDialogueBox(this)
        cursors = this.input.keyboard?.createCursorKeys()

        const heading = this.add
          .text(12, 10, 'PORTARIA  •  QUEST 01', {
            fontFamily: 'monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#1e3550ed',
            padding: { x: 9, y: 7 },
          })
          .setScrollFactor(0)
          .setDepth(1950)
        const controls = this.add
          .text(12, 44, 'SETAS: andar   E: interagir   ESC: pausa', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#e4f1ff',
            backgroundColor: '#1e3550e8',
            padding: { x: 8, y: 5 },
          })
          .setScrollFactor(0)
          .setDepth(1950)
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
          .setDepth(1950)
          .setVisible(false)
        hint = doorHint
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
        }
        fixHud()
        this.scale.on('resize', fixHud)
        this.events.once('shutdown', () => this.scale.off('resize', fixHud))

        const pauseMenu = createPauseMenu(this, { isBlocked: () => dialogueBox.active })

        // The screens and the panel hang high on the back wall, out of a frame that follows
        // the player: the cues take the camera there to show what happens, and back after.
        const camera = this.cameras.main
        const lookAt = (point: { x: number; y: number }, then: () => void): void => {
          camera.stopFollow()
          camera.pan(point.x, point.y, 700, 'Sine.easeInOut', false, (_camera, progress) => {
            if (progress === 1) then()
          })
        }
        const lookBack = (then: () => void): void => {
          camera.pan(spawned.x, spawned.y, 700, 'Sine.easeInOut', false, (_camera, progress) => {
            if (progress === 1) {
              // The room is bigger than the view, so frameRoom had it following the player.
              camera.startFollow(spawned)
              then()
            }
          })
        }
        const centreOf = (...ids: string[]): { x: number; y: number } => {
          const shown = ids
            .map((id) => images.get(id))
            .filter((image): image is Phaser.GameObjects.Image => image !== undefined)
          const xs = shown.flatMap((image) => [image.x, image.x + image.width])
          const ys = shown.flatMap((image) => [image.y, image.y + image.height])
          return {
            x: (Math.min(...xs) + Math.max(...xs)) / 2,
            // A little below the wall, so the floor in front of it shows too.
            y: (Math.min(...ys) + Math.max(...ys)) / 2 + 50,
          }
        }

        const cues: Record<string, Cue> = {
          // The screens flicker and settle on NULL.
          'telas-null': (scene, done) =>
            lookAt(centreOf(...SCREENS), () => {
              playSfx(scene, GLITCH_SFX)
              let flicks = 0
              scene.time.addEvent({
                delay: 120,
                repeat: 6,
                callback: () => {
                  flicks += 1
                  setScreens(flicks % 2 === 1)
                  if (flicks === 7) {
                    setScreens(true)
                    scene.time.delayedCall(600, () => lookBack(done))
                  }
                },
              })
            }),
          // Davi's reset: the panel cycles through noise and lands scrambled.
          'painel-reinicia': (scene, done) =>
            lookAt(centreOf(PANEL), () => {
              playSfx(scene, NOISE_SFX, 0.4)
              let ticks = 0
              scene.time.addEvent({
                delay: 90,
                repeat: 9,
                callback: () => {
                  ticks += 1
                  if (ticks === 10) {
                    setPanel('scrambled')
                    scene.time.delayedCall(700, () => lookBack(done))
                    return
                  }
                  setPanel(ticks % 2 === 1 ? 'noise' : 'ok')
                },
              })
            }),
        }
        const cutscenes = createCutscenePlayer(this, {
          cast: {
            onStage: new Map([[PLAYER_ACTOR, spawned]]),
            offstage: { davi: DAVI_KEY },
          },
          cues,
          dialogueBox,
          depthOf: groundDepth,
        })
        cutscenePlayer = cutscenes
        busy = () => celebrating || dialogueBox.active || pauseMenu.active || cutscenes.active
        // The camera goes to the sign panel, readable again, while Marcos and Davi talk
        // (ADR 0089), then back to the player.
        playSuccess = (lines) => {
          celebrating = true
          lookAt(centreOf(PANEL), () =>
            dialogueBox.show(lines, () => lookBack(() => (celebrating = false))),
          )
        }
        startPendingCutscene = () => {
          if (cutscenes.active || dialogueBox.active) return
          const cutscene = options.cutscenes.pending(KEY)
          if (cutscene === undefined) return
          options.cutscenes.onStart()
          spawned.anims.stop()
          cutscenes.play(cutscene, () => options.cutscenes.onEnd(cutscene))
        }

        this.input.keyboard?.on('keydown-E', () => {
          if (busy()) return
          if (nearMarcos) {
            const conversation = options.onTalkToNpc('Marcos')
            if (conversation !== undefined) {
              dialogueBox.show(conversation.offer, conversation.open)
            }
            return
          }
          if (nearExit) {
            if (options.canLeave()) {
              playLoadedSfx(this, SFX.doorClose, 0.5)
              this.scene.start('campus')
              return
            }
            dialogueBox.show(
              [{ speaker: 'Marcos', text: 'Ainda não. Resolve a cifra das placas primeiro.' }],
              () => {},
            )
          }
        })

        onScreen = true
        this.events.once('shutdown', () => {
          onScreen = false
          player = undefined
          playerShadow = undefined
          cursors = undefined
          hint = undefined
          cutscenePlayer = undefined
          busy = () => false
          playSuccess = () => {}
          celebrating = false
          refresh = () => {}
          startPendingCutscene = () => {}
        })

        startPendingCutscene()
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) return
        if (!busy()) {
          const lines = options.takeSuccessDialogue?.()
          if (lines !== undefined) playSuccess(lines)
        }
        if (busy()) {
          if (cutscenePlayer?.active !== true) player.anims.stop()
          sortByGround(player, playerShadow)
          hint?.setVisible(false)
          return
        }

        const oldX = player.x
        const oldY = player.y
        movePlayer(player, cursors, SPEED, Math.min(this.game.loop.delta, 45) / 1000)
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
            corners.some(([px, py]) => !insideFloor(px, py)) ||
            furniture.some((shape) => rectsOverlap(feet, shape)) ||
            obstacles.some((box) => rectsOverlap(feet, box))
          )
        }
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
          this.time.now - lastStepAt > 220
        ) {
          lastStepAt = this.time.now
          playStep(this)
        }

        const { x, y } = player
        nearMarcos = Math.hypot(x - PORTARIA_TALK.x, y - PORTARIA_TALK.y) < TALK_DISTANCE
        nearExit = Math.hypot(x - PORTARIA_EXIT.x, y - PORTARIA_EXIT.y) < EXIT_DISTANCE
        const message = nearMarcos
          ? 'E  FALAR COM O MARCOS'
          : nearExit
            ? options.canLeave()
              ? 'E  SAIR PARA O CAMPUS'
              : 'E  PORTA (O MARCOS AINDA NÃO LIBEROU)'
            : ''
        hint?.setText(message).setVisible(message.length > 0)
      },
    },

    progressChanged: () => {
      if (onScreen) {
        refresh()
        startPendingCutscene()
      }
    },
  }
}

/** Depth by where the feet touch the floor, the same rule as every prop's (100 + bottom). */
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
