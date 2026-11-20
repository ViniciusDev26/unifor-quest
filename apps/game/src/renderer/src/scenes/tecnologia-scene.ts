import Phaser from 'phaser'
import { playMusic, playSfx, preloadAudio } from '../audio/music.js'
import { playLoadedSfx, playStep, preloadWorldSfx, SFX } from '../audio/sfx.js'
import { frameRoom } from './camera.js'
import { CAMPUS_ENTRANCES } from './campus-assets.generated.js'
import { type Cue, type CutscenePlayer, createCutscenePlayer } from './cutscene-player.js'
import { createDialogueBox } from './dialogue-box.js'
import {
  type Conversation,
  type CutsceneHost,
  type Furniture,
  PLAYER_ACTOR,
  readShapes,
} from './interior-scene.js'
import { createNpc, preloadNpcSprite } from './npc.js'
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
import { createServerLeds } from './server-leds.js'
import { TECH_PROPS } from './tech-assets.generated.js'

const KEY = 'bloco-de-tecnologia'
/**
 * The building's tracks (GDD §5): `dungeon` while NULL holds the place, `the_evil_one` near
 * its terminal, `battle_1` while the duel's editor is open, and the campus' own `town` once
 * the network is back.
 */
const DUNGEON_MUSIC = 'technology-dungeon'
const EVIL_MUSIC = 'technology-evil-one'
const BATTLE_MUSIC = 'technology-battle'
const TOWN_MUSIC = 'campus-theme'
/** How far from the terminal the evil theme lets go again: farther than where it starts. */
const NULL_MUSIC_RELEASE = 190
const GLITCH_SFX = 'tech-null-glitch'
/** NULL's console once the network is back: "REDE OK" instead of "NULL" (#15). */
const CONSOLE_OK = 'tech-prop-null-console-ok'
/** Where the south steps land on the campus (the facade's door), and the north ones (behind). */
const CAMPUS_SOUTH_DOOR = CAMPUS_ENTRANCES['bloco-de-tecnologia']
const CAMPUS_NORTH_DOOR = CAMPUS_ENTRANCES['bloco-de-tecnologia:norte']
const TILE = 16
const SPEED = 172
const TERMINAL = { x: 705, y: 617 }
const EXITS = [
  { x: 705, y: 163, name: 'norte', label: 'SAIR PELA ESCADINHA NORTE' },
  { x: 705, y: 785, name: 'sul', label: 'SAIR PELA ESCADINHA SUL' },
] as const
const EXIT_DISTANCE = 72
const CLASSROOMS = [
  ...Array.from({ length: 5 }, (_, i) => ({ name: `T10${i + 1}`, x: 100 + i * 96, y: 354 })),
  ...Array.from({ length: 5 }, (_, i) => ({
    name: `T1${String(i + 6).padStart(2, '0')}`,
    x: 972 + i * 96,
    y: 354,
  })),
  ...Array.from({ length: 5 }, (_, i) => ({ name: `T20${i + 1}`, x: 100 + i * 96, y: 704 })),
  ...Array.from({ length: 5 }, (_, i) => ({
    name: `T2${String(i + 6).padStart(2, '0')}`,
    x: 972 + i * 96,
    y: 704,
  })),
] as const
const STUDENTS = [
  { key: 'tech-student-a', path: 'characters/young_girl.png', x: 570, y: 250 },
  { key: 'tech-student-b', path: 'characters/hat_girl.png', x: 460, y: 395 },
  { key: 'tech-student-c', path: 'characters/purple_girl.png', x: 917, y: 490 },
] as const

type Exit = (typeof EXITS)[number]

// Elliptical collision for lounge furniture, just as in the renovated CC.
function hitsFurniture(feet: Rect, shape: Furniture): boolean {
  if (!rectsOverlap(feet, shape)) return false
  if (shape.kind === 'rect') return true
  const rx = shape.width / 2
  const ry = shape.height / 2
  if (rx <= 0 || ry <= 0) return false
  const closestX = Math.max(feet.x, Math.min(shape.x + rx, feet.x + feet.width))
  const closestY = Math.max(feet.y, Math.min(shape.y + ry, feet.y + feet.height))
  return ((closestX - shape.x - rx) / rx) ** 2 + ((closestY - shape.y - ry) / ry) ** 2 < 1
}

export type TecnologiaScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
    update: (this: Phaser.Scene) => void
  }
}

/**
 * Quest 4 follows the approved floor plan: bigger classroom wings, a larger bathroom,
 * red Mequi kiosk, and two short *entrance steps* (not second-floor stairs).
 * The environment is built from independently rendered pixel-art sprites, sorted
 * by their physical contact position. The exact same manifest generates Tiled
 * colliders. NULL remains interactive and Dijkstra / progress flags are unchanged.
 *
 * Once NULL is defeated and the editor panel is closed, the ending plays here (ADR 0066,
 * 0076): the `null-se-desfaz` cue draws the network coming back, and `volta-ao-campus`
 * hands the player to the campus, where the epilogue and the credits follow. Davi is not
 * in this room: he is an actor of the epilogue, never an NPC to talk to.
 */
export function createTecnologiaScene(options: {
  onTalkToNpc: (id: string) => Conversation | undefined
  cutscenes: CutsceneHost
  isDefeated: () => boolean
  /** False while the quest panel still covers the scene: the payoff waits to be seen. */
  canPlayCompletion?: () => boolean
}): TecnologiaScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let furniture: Furniture[] = []
  let insideFloor: (x: number, y: number) => boolean = () => false
  let mapWidth = 0
  let mapHeight = 0
  let students: ReturnType<typeof createNpc>[] = []
  let nearNull = false
  let nearExit: Exit | undefined
  let nearRoom: (typeof CLASSROOMS)[number] | undefined
  let nearBathroom = false
  let nearKiosk = false
  let defeated = false
  let bossStatus: Phaser.GameObjects.Text | undefined
  let bossMarker: Phaser.GameObjects.Text | undefined
  let bossHalo: Phaser.GameObjects.Ellipse | undefined
  let hint: Phaser.GameObjects.Text | undefined
  let overview: Phaser.GameObjects.Container | undefined
  let overviewActive = false
  let dialogue: ReturnType<typeof createDialogueBox> | undefined
  let playerShadow: Phaser.GameObjects.Ellipse | undefined
  let collisionDebug: Phaser.GameObjects.Graphics | undefined
  let overviewDot: Phaser.GameObjects.Arc | undefined
  let lastFootstepAt = 0
  let cutscenePlayer: CutscenePlayer | undefined
  let startPendingCutscene = (): boolean => false
  /** Turns the hall to its look after the duel: console, status, marker and halo. */
  let restoreTechnology = (): void => {}
  /** Which track the building is on; changes only through `setMood`. */
  let mood: 'dungeon' | 'evil' | 'battle' | 'town' = 'dungeon'
  const setMood = (scene: Phaser.Scene, next: typeof mood): void => {
    if (mood === next) return
    mood = next
    const track = {
      dungeon: DUNGEON_MUSIC,
      evil: EVIL_MUSIC,
      battle: BATTLE_MUSIC,
      town: TOWN_MUSIC,
    }[next]
    playMusic(scene, track)
  }

  return {
    config: {
      key: KEY,

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON(KEY, `maps/${KEY}.tmj`)
        this.load.image('indoor', 'tilesets/indoor.png')
        this.load.image('tech-floor', 'scene-art/tech-ground.png')
        this.load.image('tech-overview', 'scene-art/tech-overview.png')
        for (const prop of TECH_PROPS) {
          this.load.image(`tech-prop-${prop.id}`, `scene-art/tech-props/${prop.id}.png`)
        }
        this.load.image(CONSOLE_OK, 'scene-art/tech-props/null-console-ok.png')
        preloadPlayer(this)
        for (const student of STUDENTS) preloadNpcSprite(this, student.key, student.path)
        preloadAudio(this, DUNGEON_MUSIC, 'audio/music/rpgchip06_dungeon.ogg')
        preloadAudio(this, EVIL_MUSIC, 'audio/music/rpgchip12_the_evil_one.ogg')
        preloadAudio(this, BATTLE_MUSIC, 'audio/music/rpgchip13_battle_1.ogg')
        preloadAudio(this, TOWN_MUSIC, 'audio/music/rpgchip03_town.ogg')
        preloadAudio(this, GLITCH_SFX, 'audio/sfx/interface/glitch_002.ogg')
        preloadPauseMenuAudio(this)
        preloadWorldSfx(this)
      },

      create(this: Phaser.Scene) {
        const map = this.add.tilemap(KEY)
        const tileset = map.addTilesetImage('indoor', 'indoor')
        const floorLayer = tileset === null ? null : map.createLayer('ground', tileset)
        floorLayer?.setVisible(false)
        mapWidth = map.widthInPixels
        mapHeight = map.heightInPixels
        // Only stone floor and shell are background. Rooms, bathroom, Mequi,
        // servers and seating are physical sprites occluding characters by Y depth.
        this.add.image(0, 0, 'tech-floor').setOrigin(0, 0).setDepth(-20)
        let nullConsole: Phaser.GameObjects.Image | undefined
        for (const prop of TECH_PROPS) {
          const image = this.add
            .image(prop.x, prop.y, `tech-prop-${prop.id}`)
            .setOrigin(0, 0)
            .setDepth(100 + prop.depthY)
          if (prop.id === 'null-console') {
            nullConsole = image
          }
        }
        const leds = createServerLeds(
          this,
          TECH_PROPS.filter((prop) => prop.id.startsWith('null-servidor')),
        )
        // The building is colder and darker than the rest of the campus while NULL is in it
        // (GDD §4); the gloom lifts when the network comes back.
        const gloom = this.add
          .rectangle(0, 0, mapWidth, mapHeight, 0x0b1830, 0.22)
          .setOrigin(0, 0)
          .setDepth(1700)
        furniture = readShapes(map)
        collisionDebug = this.add.graphics().setDepth(1990).setVisible(false)
        collisionDebug.lineStyle(2, 0xffde82, 0.95)
        for (const shape of furniture) {
          if (shape.kind === 'ellipse') {
            collisionDebug.strokeEllipse(
              shape.x + shape.width / 2,
              shape.y + shape.height / 2,
              shape.width,
              shape.height,
            )
          } else {
            collisionDebug.strokeRect(shape.x, shape.y, shape.width, shape.height)
          }
        }
        this.input.keyboard?.on('keydown-F3', () => {
          collisionDebug?.setVisible(!collisionDebug.visible)
        })
        insideFloor = (x, y) => {
          if (floorLayer === null || x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return false
          const tile = floorLayer.getTileAt(Math.floor(x / TILE), Math.floor(y / TILE))
          return tile !== null && tile.index >= 0
        }

        // The little orange thresholds are usable doors, not staircases to a second level.
        for (const exit of EXITS) {
          const glow = this.add
            .ellipse(exit.x, exit.y + 9, 86, 26, 0xffca72, 0.12)
            .setStrokeStyle(2, 0xffdf9a, 0.35)
            .setDepth(1)
          this.tweens.add({ targets: glow, alpha: 0.35, duration: 1250, yoyo: true, repeat: -1 })
        }

        bossHalo = this.add
          .ellipse(TERMINAL.x, TERMINAL.y + 18, 139, 46, 0x8b36df, 0.13)
          .setStrokeStyle(2, 0xc86bff, 0.72)
          .setDepth(100 + 657)
        this.tweens.add({
          targets: bossHalo,
          alpha: 0.62,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 1150,
          yoyo: true,
          repeat: -1,
        })
        bossMarker = this.add
          .text(TERMINAL.x, 504, '!', {
            fontFamily: 'monospace',
            fontStyle: 'bold',
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#c83557',
            padding: { x: 7, y: 1 },
          })
          .setOrigin(0.5)
          .setDepth(1900)
        bossStatus = this.add
          .text(TERMINAL.x, 665, 'NULL • [E] ACESSAR O TERMINAL', {
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#f7d5ff',
            backgroundColor: '#35154de8',
            padding: { x: 8, y: 5 },
          })
          .setOrigin(0.5)
          .setDepth(1900)

        students = STUDENTS.map(({ key, x, y }) => createNpc(this, key, x, y))
        for (const student of students) student.sprite.setDepth(100 + student.y + 16)

        restoreTechnology = () => {
          nullConsole?.setTexture(CONSOLE_OK)
          bossStatus
            ?.setText('✓ NULL DESATIVADO • REDE RESTAURADA')
            .setColor('#b5ffe1')
            .setBackgroundColor('#205c4fe8')
          bossMarker?.setText('✓').setBackgroundColor('#268b60')
          bossHalo?.setFillStyle(0x39d5ab, 0.11).setStrokeStyle(2, 0x78f5c6)
          leds.restore()
          this.tweens.add({ targets: gloom, alpha: 0, duration: 1200 })
        }

        // With the ending still due (entering after the duel, as from a save), the room starts
        // as before it, and `update` plays the ending as on the duel itself.
        defeated = options.isDefeated() && options.cutscenes.pending(KEY) === undefined
        if (defeated) restoreTechnology()
        playMusic(this, defeated ? TOWN_MUSIC : DUNGEON_MUSIC)
        mood = defeated ? 'town' : 'dungeon'

        ensurePlayerAnimations(this)
        const spawned = createPlayer(this, 705, 852).setDepth(100 + 852 + 16)
        player = spawned
        playerShadow = this.add
          .ellipse(player.x, player.y + 13, 20, 8, 0x27354a, 0.32)
          .setDepth(100 + player.y + 12)
        // Explore the building like a top-down RPG, not a full map photograph.
        // A whole-number zoom (ADR 0075): the art is drawn at the characters' pixel
        // density, so 2x turns every pixel into an exact 2x2 block, with no smearing.
        this.cameras.main.setZoom(2)
        this.cameras.main.roundPixels = true
        frameRoom(this, mapWidth, mapHeight, player)
        const box = createDialogueBox(this)
        dialogue = box
        cursors = this.input.keyboard?.createCursorKeys()
        createPauseMenu(this, { isBlocked: () => dialogue?.active === true || overviewActive })

        const cues: Record<string, Cue> = {
          // The duel's payoff: the terminal glitches, NULL falls apart in green blocks, and
          // the hall's status turns to "rede restaurada".
          'null-se-desfaz': (scene, done) => {
            playSfx(scene, GLITCH_SFX, 0.5)
            playLoadedSfx(scene, SFX.forceField, 0.45)
            scene.cameras.main.shake(380, 0.004)
            for (let i = 0; i < 18; i++) {
              const block = scene.add
                .rectangle(
                  TERMINAL.x + Phaser.Math.Between(-30, 30),
                  TERMINAL.y + Phaser.Math.Between(-36, 8),
                  Phaser.Math.Between(3, 7),
                  Phaser.Math.Between(3, 7),
                  0x39ff6a,
                )
                .setDepth(1890)
              scene.tweens.add({
                targets: block,
                y: block.y - Phaser.Math.Between(20, 60),
                alpha: 0,
                delay: i * 40,
                duration: 900,
                onComplete: () => block.destroy(),
              })
            }
            scene.time.delayedCall(800, () => {
              restoreTechnology()
              scene.cameras.main.flash(520, 85, 245, 170)
              scene.time.delayedCall(600, done)
            })
          },
          // The ending goes on outside, on the campus back to normal (ADR 0070, 0076), in
          // front of the building's door. `done` first: the cutscene is marked seen before
          // this scene stops.
          'volta-ao-campus': (scene, done) => {
            done()
            scene.registry.set('campus:returnTo', CAMPUS_SOUTH_DOOR)
            scene.scene.start('campus')
          },
        }
        const cutscenes = createCutscenePlayer(this, {
          cast: { onStage: new Map([[PLAYER_ACTOR, spawned]]), offstage: {} },
          cues,
          dialogueBox: box,
        })
        cutscenePlayer = cutscenes
        startPendingCutscene = () => {
          if (cutscenes.active || box.active) return false
          const cutscene = options.cutscenes.pending(KEY)
          if (cutscene === undefined) return false
          options.cutscenes.onStart()
          spawned.anims.stop()
          hint?.setVisible(false)
          cutscenes.play(cutscene, () => options.cutscenes.onEnd(cutscene))
          return true
        }

        const heading = this.add
          .text(12, 10, 'BLOCO DE TECNOLOGIA  •  QUEST 04', {
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
          .text(12, 44, 'SETAS: andar   E: interagir   M: mapa   F3: colisões   ESC: pausa', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#e4f1ff',
            backgroundColor: '#1e3550e8',
            padding: { x: 8, y: 5 },
          })
          .setScrollFactor(0)
          .setDepth(1950)
        hint = this.add
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

        // Screen-space HUD under a zoomed camera: zoom scales around the viewport centre,
        // so both position and scale are inverted around it (same as the CC). Without
        // this, the heading and the controls were pushed off-screen.
        const fixHud = (): void => {
          const z = this.cameras.main.zoom || 1
          const midX = this.cameras.main.width / 2
          const midY = this.cameras.main.height / 2
          const place = (item: Phaser.GameObjects.Text, x: number, y: number): void => {
            item.setPosition(midX + (x - midX) / z, midY + (y - midY) / z).setScale(1 / z)
          }
          place(heading, 12, 10)
          place(controls, 12, 44)
          if (hint !== undefined) place(hint, this.scale.width / 2, this.scale.height - 24)
          overview?.setPosition(midX * (1 - 1 / z), midY * (1 - 1 / z)).setScale(1 / z)
        }
        this.scale.on('resize', fixHud)
        this.events.once('shutdown', () => this.scale.off('resize', fixHud))

        overview = this.add.container(0, 0).setScrollFactor(0).setDepth(2100).setVisible(false)
        overview.add(
          this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x061521,
            0.93,
          ),
        )
        const zoom = Math.min(
          (this.scale.width - 80) / mapWidth,
          (this.scale.height - 85) / mapHeight,
        )
        overview.add(
          this.add
            .image(this.scale.width / 2, this.scale.height / 2 + 9, 'tech-overview')
            .setDisplaySize(Math.round(mapWidth * zoom), Math.round(mapHeight * zoom)),
        )
        overviewDot = this.add
          .circle(this.scale.width / 2, this.scale.height / 2, 5, 0xffea96)
          .setStrokeStyle(2, 0x203f63)
        overview.add(overviewDot)
        overview.add(
          this.add
            .text(
              this.scale.width / 2,
              14,
              'MAPA  •  SALAS / BANHEIRO / QUIOSQUE / NULL / SAÍDAS',
              {
                fontFamily: 'monospace',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor: '#172a42e8',
                padding: { x: 7, y: 6 },
              },
            )
            .setOrigin(0.5, 0),
        )
        overview.add(
          this.add
            .text(this.scale.width / 2, this.scale.height - 12, 'PRESSIONE M PARA VOLTAR', {
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#ffffff',
              backgroundColor: '#172a42ef',
              padding: { x: 9, y: 5 },
            })
            .setOrigin(0.5, 1),
        )
        fixHud()

        this.input.keyboard?.on('keydown-M', () => {
          if (dialogue?.active || cutscenePlayer?.active === true) return
          overviewActive = !overviewActive
          if (overviewActive && player !== undefined) {
            overviewDot?.setPosition(
              this.scale.width / 2 + (player.x - mapWidth / 2) * zoom,
              this.scale.height / 2 + 9 + (player.y - mapHeight / 2) * zoom,
            )
          }
          overview?.setVisible(overviewActive)
          hint?.setVisible(false)
        })
        this.input.keyboard?.on('keydown-E', () => {
          if (
            dialogue?.active ||
            cutscenePlayer?.active === true ||
            overviewActive ||
            player === undefined
          ) {
            return
          }
          if (!defeated && nearNull) {
            const conversation = options.onTalkToNpc('NULL')
            if (conversation !== undefined) {
              dialogue?.show(conversation.offer, () => {
                // The duel starts when its editor opens (GDD §5).
                setMood(this, 'battle')
                conversation.open()
              })
            }
          } else if (nearExit !== undefined) {
            // The north and south thresholds return to opposite sides of the
            // tech building on the campus (campus-assets.generated.ts).
            const campusReturn = nearExit.name === 'norte' ? CAMPUS_NORTH_DOOR : CAMPUS_SOUTH_DOOR
            this.registry.set('campus:returnTo', campusReturn)
            playLoadedSfx(this, SFX.techDoorClose, 0.5)
            this.scene.start('campus')
          } else if (nearBathroom) {
            dialogue?.show(
              [
                {
                  speaker: 'Estudante',
                  text: 'Os banheiros ficam aqui, ao lado do quiosque. O terminal infectado está no corredor central.',
                },
              ],
              () => {},
            )
          } else if (nearKiosk) {
            dialogue?.show(
              [
                {
                  speaker: 'Atendente',
                  text: 'Bem-vindo ao quiosque! A rede está instável por causa do NULL. O terminal fica logo adiante.',
                },
              ],
              () => {},
            )
          } else if (nearRoom !== undefined) {
            dialogue?.show(
              [
                {
                  speaker: `Sala ${nearRoom.name}`,
                  text: 'Sala de aula do Bloco de Tecnologia. A missão principal está no terminal NULL, no hall central.',
                },
              ],
              () => {},
            )
          }
        })

        this.events.once('shutdown', () => {
          player = undefined
          cursors = undefined
          students = []
          nearExit = undefined
          nearRoom = undefined
          nearNull = false
          cutscenePlayer = undefined
          startPendingCutscene = () => false
          restoreTechnology = () => {}
          overviewActive = false
          overview = undefined
          overviewDot = undefined
          playerShadow = undefined
          collisionDebug = undefined
          dialogue = undefined
        })
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) return
        if (!defeated && options.isDefeated() && (options.canPlayCompletion?.() ?? true)) {
          defeated = true
          overviewActive = false
          overview?.setVisible(false)
          // The ending draws the restoration itself; without one due (a replay after it was
          // seen), the room just turns to its restored look.
          if (!startPendingCutscene()) {
            restoreTechnology()
            this.cameras.main.flash(520, 85, 245, 170)
          }
          setMood(this, 'town')
        }
        // The duel's editor closed without a win: back to facing NULL.
        if (!defeated && mood === 'battle' && (options.canPlayCompletion?.() ?? true)) {
          setMood(this, 'evil')
        }

        if (dialogue?.active || cutscenePlayer?.active === true || overviewActive) {
          if (cutscenePlayer?.active !== true) player.anims.stop()
          return
        }
        const oldX = player.x
        const oldY = player.y
        // Resolve small substeps on each axis to slide along classroom walls and
        // chairs without snapping back or tunnelling through thin lamp footprints.
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
            furniture.some((shape) => hitsFurniture(feet, shape)) ||
            students.some(({ sprite }) =>
              rectsOverlap(feet, {
                x: sprite.x - 11,
                y: sprite.y + 4,
                width: 22,
                height: 9,
              }),
            )
          )
        }
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 3))
        for (let i = 0; i < steps; i++) {
          const nx = player.x + dx / steps
          const ny = player.y + dy / steps
          if (!blocked(nx, player.y)) player.x = nx
          if (!blocked(player.x, ny)) player.y = ny
        }
        player.setDepth(100 + player.y + 16)
        playerShadow?.setPosition(player.x, player.y + 13).setDepth(100 + player.y + 12)
        for (const student of students) student.sprite.setDepth(100 + student.sprite.y + 16)
        if (
          Math.hypot(player.x - oldX, player.y - oldY) > 0.4 &&
          this.time.now - lastFootstepAt > 185
        ) {
          lastFootstepAt = this.time.now
          playStep(this)
          const dust = this.add
            .ellipse(player.x, player.y + 13, 6, 3, 0xb8a89b, 0.35)
            .setDepth(100 + player.y + 10)
          this.tweens.add({
            targets: dust,
            alpha: 0,
            scale: 1.8,
            duration: 320,
            onComplete: () => dust.destroy(),
          })
        }
        const toNull = Math.hypot(player.x - TERMINAL.x, player.y - TERMINAL.y)
        nearNull = toNull < 84
        // Walking up to the terminal is the arrival at the showdown (GDD §5); the theme lets
        // go only well past where it started, so it does not flicker at the edge.
        if (!defeated && mood !== 'battle') {
          if (toNull < 150) setMood(this, 'evil')
          else if (toNull > NULL_MUSIC_RELEASE) setMood(this, 'dungeon')
        }
        const here = { x: player.x, y: player.y }
        nearExit = EXITS.find(
          (exit) => Math.hypot(here.x - exit.x, here.y - exit.y) < EXIT_DISTANCE,
        )
        nearBathroom = Math.hypot(player.x - 628, player.y - 471) < 75
        nearKiosk = Math.hypot(player.x - 795, player.y - 472) < 73
        nearRoom = CLASSROOMS.find(({ x, y }) => Math.hypot(here.x - x, here.y - y) < 47)
        const message =
          !defeated && nearNull
            ? 'E  ENFRENTAR O NULL • DIJKSTRA'
            : nearExit?.label
              ? `E  ${nearExit.label}`
              : nearBathroom
                ? 'E  VER BANHEIRO'
                : nearKiosk
                  ? 'E  CONVERSAR NO MEQUI'
                  : nearRoom
                    ? `E  VER SALA ${nearRoom.name}`
                    : ''
        hint?.setText(message).setVisible(message.length > 0)
      },
    },
  }
}
