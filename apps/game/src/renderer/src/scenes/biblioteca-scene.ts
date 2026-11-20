import type Phaser from 'phaser'
import { playMusic, preloadAudio } from '../audio/music.js'
import { playLoadedSfx, playStep, preloadWorldSfx, SFX } from '../audio/sfx.js'
import {
  BIBLIOTECA_CELIA,
  BIBLIOTECA_DOOR,
  BIBLIOTECA_PROPS,
  BIBLIOTECA_SPAWN,
  BIBLIOTECA_SPRITES,
  type BibliotecaProp,
  type BibliotecaPropState,
} from './biblioteca-assets.generated.js'
import { type CutscenePlayer, createCutscenePlayer } from './cutscene-player.js'
import { createDialogueBox, type DialogueBox } from './dialogue-box.js'
import {
  type Conversation,
  type CutsceneHost,
  type Furniture,
  PLAYER_ACTOR,
  readShapes,
  type TakeSuccessDialogue,
} from './interior-scene.js'
import { createNpc, type Npc, npcBox, preloadNpcSprite } from './npc.js'
import { createPauseMenu, preloadPauseMenuAudio } from './pause-menu.js'
import {
  createPlayer,
  ensurePlayerAnimations,
  feetBoxAt,
  movePlayer,
  preloadPlayer,
  rectsOverlap,
} from './player.js'

const KEY = 'biblioteca'
const MUSIC = 'biblioteca-theme'
const TILE = 16
const SPEED = 120
/**
 * A whole number on purpose. The room is drawn at one art pixel per game pixel, the same
 * density as the characters, so a 2x zoom turns every pixel into an exact 2x2 block. A
 * fractional zoom (the CC uses 1.45) makes neighbouring pixels 1 and 2 screen pixels wide,
 * which is what reads as blurry/smeared pixel art.
 */
const ZOOM = 2
const TALK_DISTANCE = 72
const EXIT_DISTANCE = 34
const DEPTH_BASE = 100
const HUD_DEPTH = 1950
const LIGHT_DEPTH = 1500
/** The lit path runs down the rug's centre, from the counter to the door. */
const PATH_TOP = 122
const PATH_STEP = 20

type State = 'before' | 'after'

type PlacedProp = {
  prop: BibliotecaProp
  image: Phaser.GameObjects.Image | undefined
}

export type BibliotecaScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
    update: (this: Phaser.Scene) => void
  }
  /** Called on every progress change: plays the cutscene now due here, if any (ADR 0066). */
  progressChanged: () => void
}

function textureKey(sprite: string): string {
  return `bib-${sprite}`
}

/** The sprite (and offset) a prop shows in a given state, or undefined if it is hidden. */
function spriteFor(prop: BibliotecaProp, state: State): BibliotecaPropState | undefined {
  if (prop.states === undefined) {
    return { sprite: prop.sprite }
  }
  const entry = prop.states[state]
  if (entry === undefined) {
    return undefined
  }
  return typeof entry === 'string' ? { sprite: entry } : entry
}

/**
 * Interior of the Biblioteca, where Dona Célia offers "A árvore do acervo" (docs/story.md).
 *
 * Layered pixel art in the same spirit as the CC (Quest 3): a flat ground image, then every
 * shelf, table, chair and plant as its own sprite sorted by where it touches the floor, so
 * the player walks behind a bookcase and in front of it. The art and the collision both come
 * from scripts/render-biblioteca-pixel-art.py, so they cannot drift apart.
 *
 * The room has two looks. Before the quest the free-standing shelves lie on the floor with
 * books everywhere and the terminal shows NULL; once `acervo-organizado` is set (the
 * quest's own effect) the shelves stand back up, in place, while the player watches.
 */
export function createBibliotecaScene(options: {
  onTalkToNpc: (npcId: string) => Conversation | undefined
  cutscenes: CutsceneHost
  isOrganized: () => boolean
  /** False while the quest panel still covers the scene: the payoff waits to be seen. */
  canPlayCompletion?: () => boolean
  /** Dona Célia's reaction, said once the shelves are up and the path is lit (ADR 0089). */
  takeSuccessDialogue?: TakeSuccessDialogue
}): BibliotecaScene {
  /** From the quest's payoff until its lines are said: the player watches, hands off. */
  let celebrating = false
  let player: Phaser.GameObjects.Sprite | undefined
  let playerShadow: Phaser.GameObjects.Ellipse | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let celia: Npc | undefined
  let dialogue: DialogueBox | undefined
  let obstacles: Furniture[] = []
  let placed: PlacedProp[] = []
  let insideFloor: (x: number, y: number) => boolean = () => false
  let state: State = 'before'
  let nearCelia = false
  let nearDoor = false
  let overviewActive = false
  let lastFootstepAt = 0
  let actionHint: Phaser.GameObjects.Text | undefined
  let actionMarker: Phaser.GameObjects.Text | undefined
  let missionStatus: Phaser.GameObjects.Text | undefined
  let screenGlow: Phaser.GameObjects.Rectangle | undefined
  let screenFlicker: Phaser.Tweens.Tween | undefined
  let cutscenePlayer: CutscenePlayer | undefined
  let activeScene: Phaser.Scene | undefined
  let startPendingCutscene = (): void => {}

  const missionText = (): string =>
    state === 'after'
      ? 'ACERVO ORGANIZADO  •  SIGA PARA O CENTRO DE CONVIVÊNCIA'
      : 'FALE COM A DONA CÉLIA NO BALCÃO [E]'

  return {
    config: {
      key: KEY,

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON(KEY, `maps/${KEY}.tmj`)
        this.load.image('indoor', 'tilesets/indoor.png')
        this.load.image('bib-ground', 'scene-art/biblioteca-ground.png')
        this.load.image('bib-light', 'scene-art/biblioteca-light.png')
        this.load.image('bib-overview-before', 'scene-art/biblioteca-overview-before.png')
        this.load.image('bib-overview-after', 'scene-art/biblioteca-overview-after.png')
        for (const sprite of BIBLIOTECA_SPRITES) {
          this.load.image(textureKey(sprite), `scene-art/biblioteca-props/${sprite}.png`)
        }
        preloadPlayer(this)
        preloadNpcSprite(this, 'npc-Dona Célia', 'characters/celia.png')
        preloadAudio(this, MUSIC, 'audio/music/rpgchip07_the_shrine_of_mysteries.ogg')
        preloadPauseMenuAudio(this)
        preloadWorldSfx(this)
      },

      create(this: Phaser.Scene) {
        playMusic(this, MUSIC)
        state = options.isOrganized() ? 'after' : 'before'

        const map = this.add.tilemap(KEY)
        const tileset = map.addTilesetImage('indoor', 'indoor')
        const floorLayer = tileset === null ? null : map.createLayer('ground', tileset)
        // The Tiled ground only answers "is this floor?"; the art is the ground image.
        floorLayer?.setVisible(false)
        const mapWidth = map.widthInPixels
        const mapHeight = map.heightInPixels
        insideFloor = (x, y) => {
          if (floorLayer === null || x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
            return false
          }
          const tile = floorLayer.getTileAt(Math.floor(x / TILE), Math.floor(y / TILE))
          return tile !== null && tile.index >= 0
        }
        obstacles = readShapes(map)

        this.add.image(0, 0, 'bib-ground').setOrigin(0, 0).setDepth(-20)

        placed = BIBLIOTECA_PROPS.map((prop) => {
          const look = spriteFor(prop, state)
          if (look === undefined) {
            return { prop, image: undefined }
          }
          const image = this.add
            .image(prop.x + (look.dx ?? 0), prop.y + (look.dy ?? 0), textureKey(look.sprite))
            .setOrigin(0, 0)
            .setDepth(prop.kind === 'decal' ? -10 : DEPTH_BASE + prop.depthY)
          return { prop, image }
        })

        // Sunlight through the windows: a soft overlay that slowly breathes.
        const light = this.add.image(0, 0, 'bib-light').setOrigin(0, 0).setDepth(LIGHT_DEPTH)
        this.tweens.add({
          targets: light,
          alpha: 0.7,
          duration: 3200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
        addDustMotes(this)

        // The terminal's screen glows and flickers while NULL is on it.
        const terminal = BIBLIOTECA_PROPS.find((prop) => prop.kind === 'terminal')
        if (terminal !== undefined) {
          screenGlow = this.add
            .rectangle(terminal.x + 13, terminal.y + 9, 22, 16, 0x62f59c, 0.18)
            .setDepth(DEPTH_BASE + terminal.depthY + 1)
          if (state === 'before') {
            screenFlicker = this.tweens.add({
              targets: screenGlow,
              alpha: 0.05,
              duration: 90,
              yoyo: true,
              repeat: -1,
              repeatDelay: 1400,
            })
          }
        }

        if (state === 'after') {
          lightPath(this, false)
        }

        celia = createNpc(this, 'npc-Dona Célia', BIBLIOTECA_CELIA.x, BIBLIOTECA_CELIA.y)
        celia.sprite.setDepth(DEPTH_BASE + celia.y + 16)

        // The doorway: a soft pulse on the step instead of a placeholder blue square.
        const doorGlow = this.add
          .ellipse(BIBLIOTECA_DOOR.x, BIBLIOTECA_DOOR.y + 4, 34, 10, 0xffe7a8, 0.18)
          .setDepth(-5)
        this.tweens.add({ targets: doorGlow, alpha: 0.45, duration: 1100, yoyo: true, repeat: -1 })

        ensurePlayerAnimations(this)
        const spawned = createPlayer(this, BIBLIOTECA_SPAWN.x, BIBLIOTECA_SPAWN.y)
        player = spawned
        playerShadow = this.add.ellipse(spawned.x, spawned.y + 13, 16, 6, 0x3a2028, 0.3)

        const camera = this.cameras.main
        camera.setZoom(ZOOM)
        camera.roundPixels = true
        camera.setBounds(0, 0, mapWidth, mapHeight)
        camera.startFollow(spawned, true, 0.18, 0.18)

        // F3: show the real collision footprints (QA), same as the CC.
        const debug = this.add.graphics().setDepth(1990).setVisible(false)
        debug.lineStyle(1, 0xffdc72, 0.9)
        for (const obstacle of obstacles) {
          debug.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
        }
        this.input.keyboard?.on('keydown-F3', () => debug.setVisible(!debug.visible))

        // HUD, in screen pixels. Texts are counter-scaled by the camera zoom; with a whole
        // number zoom that lands every glyph back on exact screen pixels.
        const hud = createHud(this)
        hud.add(12, 10, 'BIBLIOTECA  •  QUEST 02', {
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#fff4dc',
          backgroundColor: '#5a3326f0',
          padding: { x: 9, y: 7 },
        })
        hud.add(12, 44, 'SETAS: andar   E: interagir   M: mapa   ESC: pausa', {
          fontSize: '12px',
          color: '#ffeacc',
          backgroundColor: '#5a3326e6',
          padding: { x: 7, y: 5 },
        })
        missionStatus = hud.add(12, 74, missionText(), {
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#ffe08a',
          backgroundColor: '#3a2028eb',
          padding: { x: 8, y: 6 },
        })
        actionHint = hud.add(
          this.scale.width / 2,
          this.scale.height - 23,
          '',
          {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#3a2028e0',
            padding: { x: 15, y: 7 },
          },
          0.5,
        )
        actionHint.setVisible(false)
        actionMarker = this.add
          .text(0, 0, '!', {
            fontFamily: 'monospace',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffe08a',
            stroke: '#3a2028',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 1)
          .setScale(1 / ZOOM)
          .setDepth(HUD_DEPTH)
          .setVisible(false)
        this.tweens.add({
          targets: actionMarker,
          y: '-=2',
          duration: 450,
          yoyo: true,
          repeat: -1,
        })

        const overview = createOverview(this, mapWidth, mapHeight)
        const box = createDialogueBox(this)
        dialogue = box
        // Same contract as every other room (interior-scene.ts, ADR 0066): a cutscene due in
        // `biblioteca` plays here, with the player as the only actor on stage.
        const cutscenes = createCutscenePlayer(this, {
          cast: { onStage: new Map([[PLAYER_ACTOR, spawned]]), offstage: {} },
          cues: {},
          dialogueBox: box,
        })
        cutscenePlayer = cutscenes
        activeScene = this
        startPendingCutscene = () => {
          if (cutscenes.active || box.active) return
          const cutscene = options.cutscenes.pending(KEY)
          if (cutscene === undefined) return
          options.cutscenes.onStart()
          spawned.anims.stop()
          cutscenes.play(cutscene, () => options.cutscenes.onEnd(cutscene))
        }
        cursors = this.input.keyboard?.createCursorKeys()
        createPauseMenu(this, { isBlocked: () => dialogue?.active === true || overviewActive })

        this.input.keyboard?.on('keydown-M', () => {
          if (dialogue?.active === true || celebrating || player === undefined) return
          overviewActive = !overviewActive
          overview.show(overviewActive, player.x, player.y, state)
          actionHint?.setVisible(!overviewActive && (nearCelia || nearDoor))
        })

        this.input.keyboard?.on('keydown-E', () => {
          if (
            dialogue === undefined ||
            dialogue.active ||
            celebrating ||
            cutscenePlayer?.active === true ||
            overviewActive ||
            player === undefined
          ) {
            return
          }
          if (celia !== undefined && isNear(player, celia, TALK_DISTANCE)) {
            // The catalogue opens on Dona Célia's counter.
            playLoadedSfx(this, SFX.bookOpen, 0.5)
            const conversation = options.onTalkToNpc('Dona Célia')
            if (conversation !== undefined) {
              dialogue.show(conversation.offer, conversation.open)
            }
            return
          }
          if (
            Math.hypot(player.x - BIBLIOTECA_DOOR.x, player.y - BIBLIOTECA_DOOR.y) < EXIT_DISTANCE
          ) {
            playLoadedSfx(this, SFX.doorClose, 0.5)
            this.scene.start('campus')
          }
        })

        this.events.once('shutdown', () => {
          player = undefined
          playerShadow = undefined
          cursors = undefined
          celia = undefined
          dialogue = undefined
          celebrating = false
          placed = []
          overviewActive = false
          nearCelia = false
          nearDoor = false
          screenGlow = undefined
          screenFlicker = undefined
          cutscenePlayer = undefined
          activeScene = undefined
          startPendingCutscene = () => {}
        })
        startPendingCutscene()
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) return

        if (
          state === 'before' &&
          options.isOrganized() &&
          (options.canPlayCompletion?.() ?? true)
        ) {
          state = 'after'
          // Pages riffling as the shelves stand back up and the books go home.
          playLoadedSfx(this, SFX.bookFlip, 0.6)
          const shelvesUp = playRestoration(this, placed)
          // Once the shelves are up, the way to the book lights up on the rug (#15).
          this.time.delayedCall(shelvesUp, () => lightPath(this, true))
          const lines = options.takeSuccessDialogue?.()
          if (lines !== undefined) {
            celebrating = true
            this.time.delayedCall(shelvesUp + 900, () =>
              dialogue?.show(lines, () => {
                celebrating = false
              }),
            )
          }
          screenFlicker?.stop()
          screenGlow?.setAlpha(0.22)
          missionStatus?.setText(missionText())
        }

        if (
          celebrating ||
          dialogue?.active === true ||
          cutscenePlayer?.active === true ||
          overviewActive
        ) {
          if (cutscenePlayer?.active !== true) player.anims.stop()
          return
        }

        const previousX = player.x
        const previousY = player.y
        movePlayer(player, cursors, SPEED, Math.min(this.game.loop.delta, 45) / 1000)
        const intendedX = player.x - previousX
        const intendedY = player.y - previousY
        player.setPosition(previousX, previousY)
        const talker = celia
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
            obstacles.some((obstacle) => rectsOverlap(feet, obstacle)) ||
            (talker !== undefined && rectsOverlap(feet, npcBox(talker)))
          )
        }
        // Small independent X/Y steps: no tunnelling through a chair, and sliding along a
        // shelf when walking into it at an angle.
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(intendedX), Math.abs(intendedY)) / 2))
        for (let i = 0; i < steps; i++) {
          const nextX = player.x + intendedX / steps
          const nextY = player.y + intendedY / steps
          if (!blocked(nextX, player.y)) player.x = nextX
          if (!blocked(player.x, nextY)) player.y = nextY
        }
        player.setDepth(DEPTH_BASE + player.y + 16)
        playerShadow?.setPosition(player.x, player.y + 13).setDepth(DEPTH_BASE + player.y + 12)

        if (
          Math.hypot(player.x - previousX, player.y - previousY) > 0.3 &&
          this.time.now - lastFootstepAt > 220
        ) {
          lastFootstepAt = this.time.now
          playStep(this)
          const puff = this.add
            .ellipse(player.x, player.y + 14, 5, 2, 0xd9b58a, 0.5)
            .setDepth(DEPTH_BASE + player.y + 10)
          this.tweens.add({
            targets: puff,
            alpha: 0,
            scale: 1.8,
            duration: 300,
            onComplete: () => puff.destroy(),
          })
        }

        nearCelia = celia !== undefined && isNear(player, celia, TALK_DISTANCE)
        nearDoor =
          Math.hypot(player.x - BIBLIOTECA_DOOR.x, player.y - BIBLIOTECA_DOOR.y) < EXIT_DISTANCE
        const hint = nearCelia
          ? 'E  CONVERSAR COM A DONA CÉLIA'
          : nearDoor
            ? 'E  SAIR PARA O CAMPUS'
            : ''
        actionHint?.setText(hint).setVisible(hint.length > 0)
        if (actionMarker !== undefined) {
          if (nearCelia && celia !== undefined) {
            actionMarker.setPosition(celia.x, celia.y - 16).setVisible(true)
          } else {
            actionMarker.setVisible(false)
          }
        }
      },
    },
    progressChanged: () => {
      if (activeScene?.sys.isActive() === true) {
        startPendingCutscene()
      }
    },
  }
}

function isNear(player: Phaser.GameObjects.Sprite, npc: Npc, distance: number): boolean {
  return Math.hypot(player.x - npc.x, player.y - npc.y) < distance
}

/** The shelves stand back up one after the other, the spilled books vanish. */
/**
 * "The way to the book lights up on the floor" (docs/story.md): a row of golden diamonds down
 * the rug, from Dona Célia's counter to the door — where the trail to the Centro de
 * Convivência starts. `animate` lights them one by one; otherwise they are just on, as in a
 * room entered after the quest.
 */
function lightPath(scene: Phaser.Scene, animate: boolean): void {
  const count = Math.floor((BIBLIOTECA_DOOR.y - 12 - PATH_TOP) / PATH_STEP) + 1
  for (let i = 0; i < count; i++) {
    const y = PATH_TOP + i * PATH_STEP
    const glow = scene.add
      .rectangle(BIBLIOTECA_CELIA.x, y, 9, 9, 0xf3d58a, 0.55)
      .setAngle(45)
      .setStrokeStyle(1, 0xfff1c2, 0.9)
      .setDepth(-4)
    const pulse = (): void => {
      scene.tweens.add({
        targets: glow,
        alpha: 0.3,
        duration: 1300,
        yoyo: true,
        repeat: -1,
        delay: i * 90,
        ease: 'Sine.easeInOut',
      })
    }
    if (!animate) {
      pulse()
      continue
    }
    glow.setAlpha(0).setScale(0.2)
    scene.tweens.add({
      targets: glow,
      alpha: 0.9,
      scale: 1,
      duration: 220,
      delay: i * 110,
      ease: 'Back.easeOut',
      onComplete: pulse,
    })
  }
}

/** Stands the shelves back up; returns how long that takes, in ms. */
function playRestoration(scene: Phaser.Scene, props: readonly PlacedProp[]): number {
  let order = 0
  for (const entry of props) {
    const after = spriteFor(entry.prop, 'after')
    const old = entry.image
    if (entry.prop.states === undefined) continue
    if (old !== undefined) {
      scene.tweens.add({
        targets: old,
        alpha: 0,
        duration: 260,
        delay: order * 140,
        onComplete: () => old.destroy(),
      })
    }
    if (after === undefined) {
      entry.image = undefined
      continue
    }
    const x = entry.prop.x + (after.dx ?? 0)
    const y = entry.prop.y + (after.dy ?? 0)
    const image = scene.add
      .image(x, y - 6, textureKey(after.sprite))
      .setOrigin(0, 0)
      .setDepth(DEPTH_BASE + entry.prop.depthY)
      .setAlpha(0)
    scene.tweens.add({
      targets: image,
      alpha: 1,
      y,
      duration: 320,
      delay: order * 140 + 180,
      ease: 'Back.easeOut',
    })
    entry.image = image
    order += 1
  }

  const toast = scene.add
    .text(scene.scale.width / 2, 120, 'ACERVO ORGANIZADO!', {
      fontFamily: 'monospace',
      fontStyle: 'bold',
      fontSize: '19px',
      color: '#fff4dc',
      backgroundColor: '#2f6b46ef',
      padding: { x: 12, y: 9 },
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(HUD_DEPTH)
    .setAlpha(0)
  placeOnScreen(scene, toast, scene.scale.width / 2, 120)
  scene.tweens.add({ targets: toast, alpha: 1, duration: 240, hold: 1900, yoyo: true })
  // The last shelf starts at (order - 1) * 140 + 180 and takes 320 to land.
  return order * 140 + 360
}

/** Floating dust in the sunbeams: a handful of single pixels drifting slowly. */
function addDustMotes(scene: Phaser.Scene): void {
  const beams = [40, 136, 308, 404]
  for (let i = 0; i < 22; i++) {
    const beam = beams[i % beams.length] ?? 40
    const y = 60 + ((i * 37) % 130)
    const x = beam + 8 + ((i * 13) % 24) + (y - 52) * 0.35
    const mote = scene.add.rectangle(x, y, 1, 1, 0xfff1c0, 0.7).setDepth(LIGHT_DEPTH + 1)
    scene.tweens.add({
      targets: mote,
      x: x + 6,
      y: y + 10,
      alpha: 0.1,
      duration: 2600 + i * 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }
}

/**
 * Positions a screen-space object under a zoomed camera: zoom scales around the viewport's
 * centre, so both the position and the scale are inverted around it.
 */
function placeOnScreen(
  scene: Phaser.Scene,
  item: Phaser.GameObjects.Components.Transform,
  x: number,
  y: number,
): void {
  const camera = scene.cameras.main
  const zoom = camera.zoom || 1
  const midX = camera.width / 2
  const midY = camera.height / 2
  item.setPosition(midX + (x - midX) / zoom, midY + (y - midY) / zoom)
  item.setScale(1 / zoom)
}

function createHud(scene: Phaser.Scene) {
  return {
    add(
      x: number,
      y: number,
      text: string,
      style: Phaser.Types.GameObjects.Text.TextStyle,
      originX = 0,
    ): Phaser.GameObjects.Text {
      const item = scene.add
        .text(0, 0, text, { fontFamily: 'monospace', ...style })
        .setOrigin(originX, originX === 0 ? 0 : 0.5)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH)
      placeOnScreen(scene, item, x, y)
      return item
    },
  }
}

/** M: the whole room at a glance, with a dot where the player stands. */
function createOverview(scene: Phaser.Scene, mapWidth: number, mapHeight: number) {
  const width = scene.scale.width
  const height = scene.scale.height
  const container = scene.add.container(0, 0).setScrollFactor(0).setDepth(2500).setVisible(false)
  const zoom = scene.cameras.main.zoom || 1
  container
    .setPosition((width / 2) * (1 - 1 / zoom), (height / 2) * (1 - 1 / zoom))
    .setScale(1 / zoom)
  // A whole-number scale keeps the overview crisp too.
  const scale = Math.max(
    1,
    Math.floor(Math.min((width - 60) / mapWidth, (height - 80) / mapHeight)),
  )
  container.add(scene.add.rectangle(width / 2, height / 2, width, height, 0x1d1218, 0.9))
  const picture = scene.add.image(width / 2, height / 2 + 8, 'bib-overview-before').setScale(scale)
  container.add(picture)
  const dot = scene.add.circle(0, 0, 4, 0xffe08a).setStrokeStyle(2, 0x3a2028)
  container.add(dot)
  container.add(
    scene.add
      .text(width / 2, 12, 'MAPA DA BIBLIOTECA', {
        fontFamily: 'monospace',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fff4dc',
        backgroundColor: '#5a3326e8',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5, 0),
  )
  container.add(
    scene.add
      .text(width / 2, height - 10, 'PRESSIONE M PARA VOLTAR AO JOGO', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fff4dc',
        backgroundColor: '#3a2028ef',
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0.5, 1),
  )
  return {
    show(visible: boolean, playerX: number, playerY: number, look: State): void {
      picture.setTexture(`bib-overview-${look}`)
      dot.setPosition(
        width / 2 + (playerX - mapWidth / 2) * scale,
        height / 2 + 8 + (playerY - mapHeight / 2) * scale,
      )
      container.setVisible(visible)
    },
  }
}
