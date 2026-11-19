import type { DialogueLine } from '@unifor-quest/core'
import type Phaser from 'phaser'
import { playMusic, preloadAudio } from '../audio/music.js'
import { frameRoom } from './camera.js'
import { createDialogueBox } from './dialogue-box.js'
import { type Conversation, type Furniture, readShapes } from './interior-scene.js'
import { createNpc, isNearNpc, npcBox, preloadNpcSprite } from './npc.js'
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
import { TECH_PROPS } from './tech-assets.generated.js'

const KEY = 'bloco-de-tecnologia'
const MUSIC = 'technology-theme'
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
 */
export function createTecnologiaScene(options: {
  onTalkToNpc: (id: string) => Conversation | undefined
  isDefeated: () => boolean
  canPlayCompletion?: () => boolean
  successDialogue: readonly DialogueLine[]
}): TecnologiaScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let furniture: Furniture[] = []
  let insideFloor: (x: number, y: number) => boolean = () => false
  let mapWidth = 0
  let mapHeight = 0
  let davi: ReturnType<typeof createNpc> | undefined
  let daviLabel: Phaser.GameObjects.Text | undefined
  let students: ReturnType<typeof createNpc>[] = []
  let nearNull = false
  let nearDavi = false
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
        preloadPlayer(this)
        preloadNpcSprite(this, 'tech-davi', 'characters/young_guy.png')
        for (const student of STUDENTS) preloadNpcSprite(this, student.key, student.path)
        preloadAudio(this, MUSIC, 'audio/music/rpgchip07_the_shrine_of_mysteries.ogg')
        preloadPauseMenuAudio(this)
      },

      create(this: Phaser.Scene) {
        playMusic(this, MUSIC)
        const map = this.add.tilemap(KEY)
        const tileset = map.addTilesetImage('indoor', 'indoor')
        const floorLayer = tileset === null ? null : map.createLayer('ground', tileset)
        floorLayer?.setVisible(false)
        mapWidth = map.widthInPixels
        mapHeight = map.heightInPixels
        // Only stone floor and shell are background. Rooms, bathroom, Mequi,
        // servers and seating are physical sprites occluding characters by Y depth.
        this.add.image(0, 0, 'tech-floor').setOrigin(0, 0).setDepth(-20)
        for (const prop of TECH_PROPS) {
          this.add
            .image(prop.x, prop.y, `tech-prop-${prop.id}`)
            .setOrigin(0, 0)
            .setDepth(100 + prop.depthY)
        }
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

        davi = createNpc(this, 'tech-davi', 1015, 701)
        davi.sprite.setDepth(100 + davi.y + 16)
        daviLabel = this.add
          .text(davi.x, davi.y - 28, 'DAVI [E]', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#273953',
            padding: { x: 6, y: 3 },
          })
          .setOrigin(0.5)
          .setDepth(1900)
        students = STUDENTS.map(({ key, x, y }) => createNpc(this, key, x, y))
        for (const student of students) student.sprite.setDepth(100 + student.y + 16)

        defeated = options.isDefeated()
        davi.sprite.setVisible(defeated)
        daviLabel.setVisible(defeated)
        if (defeated) restoreTechnology()

        ensurePlayerAnimations(this)
        player = createPlayer(this, 705, 852).setDepth(100 + 852 + 16)
        playerShadow = this.add
          .ellipse(player.x, player.y + 13, 20, 8, 0x27354a, 0.32)
          .setDepth(100 + player.y + 12)
        // Explore the building like a top-down RPG, not a full map photograph.
        // A whole-number zoom (ADR 0075): the art is drawn at the characters' pixel
        // density, so 2x turns every pixel into an exact 2x2 block, with no smearing.
        this.cameras.main.setZoom(2)
        this.cameras.main.roundPixels = true
        frameRoom(this, mapWidth, mapHeight, player)
        dialogue = createDialogueBox(this)
        cursors = this.input.keyboard?.createCursorKeys()
        createPauseMenu(this, { isBlocked: () => dialogue?.active === true || overviewActive })

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
          if (dialogue?.active) return
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
          if (dialogue?.active || overviewActive || player === undefined) return
          if (!defeated && nearNull) {
            const conversation = options.onTalkToNpc('NULL')
            if (conversation !== undefined) dialogue?.show(conversation.offer, conversation.open)
          } else if (defeated && nearDavi) {
            dialogue?.show(options.successDialogue, () => {})
          } else if (nearExit !== undefined) {
            // The north and south thresholds return to opposite sides of the
            // tech building on the actual campus (coordinates from campus map).
            const campusReturn = nearExit.name === 'norte' ? { x: 128, y: 484 } : { x: 128, y: 632 }
            this.registry.set('campus:returnTo', campusReturn)
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
          nearDavi = false
          nearNull = false
          overviewActive = false
          overview = undefined
          overviewDot = undefined
          playerShadow = undefined
          collisionDebug = undefined
          dialogue = undefined
        })

        function restoreTechnology(): void {
          bossStatus
            ?.setText('✓ NULL DESATIVADO • REDE RESTAURADA')
            .setColor('#b5ffe1')
            .setBackgroundColor('#205c4fe8')
          bossMarker?.setText('✓').setBackgroundColor('#268b60')
          bossHalo?.setFillStyle(0x39d5ab, 0.11).setStrokeStyle(2, 0x78f5c6)
        }
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) return
        if (!defeated && options.isDefeated() && (options.canPlayCompletion?.() ?? true)) {
          defeated = true
          davi?.sprite.setVisible(true)
          daviLabel?.setVisible(true)
          bossStatus
            ?.setText('✓ NULL DESATIVADO • REDE RESTAURADA')
            .setColor('#b5ffe1')
            .setBackgroundColor('#205c4fe8')
          bossMarker?.setText('✓').setBackgroundColor('#268b60')
          bossHalo?.setFillStyle(0x39d5ab, 0.11).setStrokeStyle(2, 0x78f5c6)
          this.cameras.main.flash(520, 85, 245, 170)
        }

        if (dialogue?.active || overviewActive) return
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
            (defeated && davi !== undefined && rectsOverlap(feet, npcBox(davi))) ||
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
        nearNull = Math.hypot(player.x - TERMINAL.x, player.y - TERMINAL.y) < 84
        nearDavi = defeated && davi !== undefined && isNearNpc(davi, player.x, player.y)
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
            : defeated && nearDavi
              ? 'E  CONVERSAR COM DAVI'
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
