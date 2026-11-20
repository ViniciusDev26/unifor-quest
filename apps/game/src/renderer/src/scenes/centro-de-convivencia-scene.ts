import type { DialogueLine } from '@unifor-quest/core'
import type Phaser from 'phaser'
import { playMusic, preloadAudio } from '../audio/music.js'
import { frameRoom } from './camera.js'
import { CAMPUS_ENTRANCES } from './campus-assets.generated.js'
import { CC_PROPS } from './cc-assets.generated.js'
import { createDialogueBox } from './dialogue-box.js'
import { type Conversation, type Furniture, readShapes } from './interior-scene.js'
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

const KEY = 'centro-de-convivencia'
const MUSIC = 'cc-theme'
const TILE = 16
const SPEED = 174
const EXIT_DISTANCE = 74
const TURNSTILE_OK = 'cc-prop-catraca-ok'
const RAIMUNDO_TALK_DISTANCE = 64
const EXITS = [
  { x: 704, y: 902, name: 'Entrada principal', label: 'SAIR PELO PORTÃO SUL' },
  { x: 706, y: 118, name: 'Saída norte', label: 'SAIR PELO PORTÃO NORTE' },
] as const
const PEOPLE = [
  { key: 'cc-student-1', path: 'characters/young_girl.png', start: [566, 464], end: [813, 356] },
  { key: 'cc-student-2', path: 'characters/young_guy.png', start: [833, 522], end: [815, 398] },
  { key: 'cc-student-3', path: 'characters/hat_girl.png', start: [584, 590], end: [817, 440] },
  { key: 'cc-student-4', path: 'characters/blond.png', start: [820, 658], end: [819, 480] },
] as const

type Student = { sprite: Phaser.GameObjects.Sprite }
type Exit = (typeof EXITS)[number]

/** Ellipse hit boxes match the round tree planter / seats instead of blocking their corners. */
function overlapsFurniture(feet: Rect, shape: Furniture): boolean {
  if (!rectsOverlap(feet, shape)) return false
  if (shape.kind === 'rect') return true
  const rx = shape.width / 2
  const ry = shape.height / 2
  if (rx <= 0 || ry <= 0) return false
  const cx = shape.x + rx
  const cy = shape.y + ry
  const nearestX = Math.max(feet.x, Math.min(cx, feet.x + feet.width))
  const nearestY = Math.max(feet.y, Math.min(cy, feet.y + feet.height))
  return ((nearestX - cx) / rx) ** 2 + ((nearestY - cy) / ry) ** 2 < 1
}

export type CentroDeConvivenciaScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
    update: (this: Phaser.Scene) => void
  }
}

/**
 * Quest 3 is a layered pixel-art RPG scene, not a static concept illustration.
 * Counter, garden and furniture sprites are individually depth-sorted against
 * the player, with the same footprints used for Tiled collisions. The camera
 * follows the player through the CC while the quest and the two exits persist.
 */
export function createCentroDeConvivenciaScene(options: {
  onTalkToNpc: (id: string) => Conversation | undefined
  isQuestUnlocked: () => boolean
  isReopened: () => boolean
  canPlayCompletion?: () => boolean
  successDialogue: readonly DialogueLine[]
}): CentroDeConvivenciaScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let mapWidth = 0
  let mapHeight = 0
  let insideFloor: (x: number, y: number) => boolean = () => false
  let obstacles: Furniture[] = []
  let students: Student[] = []
  let raimundo: ReturnType<typeof createNpc> | undefined
  let nearRaimundo = false
  let nearExit: Exit | undefined
  let aligned = false
  let turnstile: Phaser.GameObjects.Image | undefined
  let queueStatus: Phaser.GameObjects.Text | undefined
  let queueDot: Phaser.GameObjects.Arc | undefined
  let queueGuide: Phaser.GameObjects.Graphics | undefined
  let actionHint: Phaser.GameObjects.Text | undefined
  let actionMarker: Phaser.GameObjects.Arc | undefined
  let dialogue: ReturnType<typeof createDialogueBox> | undefined
  let overviewActive = false
  /** Set in create(), where the HUD text it updates exists; called again from update(). */
  let updateMissionStatus: () => void = () => {}
  let overview: Phaser.GameObjects.Container | undefined
  let overviewDot: Phaser.GameObjects.Arc | undefined
  let playerShadow: Phaser.GameObjects.Ellipse | undefined
  let collisionDebug: Phaser.GameObjects.Graphics | undefined
  let lastFootstepAt = 0

  return {
    config: {
      key: KEY,

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON(KEY, `maps/${KEY}.tmj`)
        this.load.image('cc-floor', 'scene-art/cc-ground.png')
        this.load.image('cc-overview', 'scene-art/cc-overview.png')
        for (const prop of CC_PROPS) {
          this.load.image(`cc-prop-${prop.id}`, `scene-art/cc-props/${prop.id}.png`)
        }
        // The turnstile once the queue is fixed: green light instead of red (#15).
        this.load.image(TURNSTILE_OK, 'scene-art/cc-props/catraca-ok.png')
        this.load.image('indoor', 'tilesets/indoor.png')
        preloadPlayer(this)
        preloadNpcSprite(this, 'cc-raimundo', 'characters/young_guy.png')
        for (const person of PEOPLE) preloadNpcSprite(this, person.key, person.path)
        preloadAudio(this, MUSIC, 'audio/music/rpgchip03_town.ogg')
        preloadPauseMenuAudio(this)
      },

      create(this: Phaser.Scene) {
        playMusic(this, MUSIC)
        const map = this.add.tilemap(KEY)
        const tileset = map.addTilesetImage('indoor', 'indoor')
        const floorLayer = tileset === null ? null : map.createLayer('ground', tileset)
        // Keep the real Tiled ground for collision queries; do not let its old
        // 16px swatches cover the illustrated shops or stone flooring.
        floorLayer?.setVisible(false)
        mapWidth = map.widthInPixels
        mapHeight = map.heightInPixels
        // Only the paving and architectural shell are background texture. Every
        // shop, bench, table and planter is a real sprite with Y-based draw order.
        this.add.image(0, 0, 'cc-floor').setOrigin(0, 0).setDepth(-20)
        turnstile = undefined
        for (const prop of CC_PROPS) {
          const image = this.add
            .image(prop.x, prop.y, `cc-prop-${prop.id}`)
            .setOrigin(0, 0)
            .setDepth(100 + prop.depthY)
          if (prop.id === 'catraca') {
            turnstile = image
          }
        }
        insideFloor = (x, y) => {
          if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight || floorLayer === null) return false
          const tile = floorLayer.getTileAt(Math.floor(x / TILE), Math.floor(y / TILE))
          return tile !== null && tile.index >= 0
        }
        obstacles = readShapes(map)
        // F3 QA view: footprints are generated from the exact same layout as
        // the pixel sprites, rather than manually estimated from a screenshot.
        collisionDebug = this.add.graphics().setDepth(1990).setVisible(false)
        collisionDebug.lineStyle(2, 0xffdc72, 0.9)
        for (const obstacle of obstacles) {
          if (obstacle.kind === 'ellipse') {
            collisionDebug.strokeEllipse(
              obstacle.x + obstacle.width / 2,
              obstacle.y + obstacle.height / 2,
              obstacle.width,
              obstacle.height,
            )
          } else {
            collisionDebug.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
          }
        }
        this.input.keyboard?.on('keydown-F3', () => {
          collisionDebug?.setVisible(!collisionDebug.visible)
        })

        // The artwork's glass exits are real portals. Pulse a subtle interaction halo
        // over the door mat instead of drawing an ugly placeholder blue rectangle.
        for (const exit of EXITS) {
          const glow = this.add
            .ellipse(exit.x, exit.y + 11, 88, 28, 0x78d3ff, 0.13)
            .setStrokeStyle(2, 0x83cbff, 0.42)
            .setDepth(0.12)
          this.tweens.add({ targets: glow, alpha: 0.3, duration: 1250, yoyo: true, repeat: -1 })
        }

        queueGuide = this.add.graphics().setDepth(1900)
        queueDot = this.add.circle(845, 353, 7, 0xea4848).setStrokeStyle(2, 0xffffff).setDepth(1901)
        queueStatus = this.add
          .text(848, 336, 'FILA • SENHAS OFFLINE', {
            fontFamily: 'monospace',
            fontStyle: 'bold',
            fontSize: '13px',
            color: '#ffffff',
            backgroundColor: '#9b2d32ec',
            padding: { x: 7, y: 4 },
          })
          .setOrigin(0, 1)
          .setDepth(1901)

        // Position matches the exclamation mark / mission giver in the approved artwork.
        raimundo = createNpc(this, 'cc-raimundo', 705, 410)
        raimundo.sprite.setDepth(100 + raimundo.y + 16)
        const nameTag = this.add
          .text(705, 381, 'SEU RAIMUNDO  [E]', {
            fontFamily: 'monospace',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#26344be6',
            padding: { x: 6, y: 3 },
          })
          .setOrigin(0.5)
          .setDepth(1950)
        this.tweens.add({ targets: nameTag, y: 377, duration: 950, yoyo: true, repeat: -1 })

        aligned = options.isReopened()
        if (aligned) {
          turnstile?.setTexture(TURNSTILE_OK)
        }
        students = PEOPLE.map((person) => {
          const [x, y] = aligned ? person.end : person.start
          const npc = createNpc(this, person.key, x, y)
          npc.sprite.setDepth(100 + y + 16)
          return { sprite: npc.sprite }
        })
        const updateQueue = (): void => {
          queueGuide?.clear()
          if (aligned) {
            queueDot?.setFillStyle(0x36be77)
            queueStatus?.setText('FILA • ORGANIZADA').setBackgroundColor('#20744bdc')
            queueGuide?.lineStyle(3, 0x7df1a7, 0.65)
            queueGuide?.lineBetween(823, 345, 823, 493)
          } else {
            queueDot?.setFillStyle(0xea4848)
            queueStatus?.setText('FILA • SENHAS OFFLINE').setBackgroundColor('#9b2d32ec')
          }
        }
        updateQueue()

        ensurePlayerAnimations(this)
        const spawn = { x: 705, y: 800 }
        player = createPlayer(this, spawn.x, spawn.y).setDepth(100 + spawn.y + 16)
        playerShadow = this.add
          .ellipse(spawn.x, spawn.y + 13, 19, 9, 0x263a4c, 0.32)
          .setDepth(100 + spawn.y + 12)
        // The follow camera and nearest-neighbour zoom are intentional RPG framing:
        // the player explores *within* the CC instead of watching the whole postcard.
        // A whole-number zoom (ADR 0075): the art is drawn at the characters' pixel
        // density, so 2x turns every pixel into an exact 2x2 block, with no smearing.
        this.cameras.main.setZoom(2)
        this.cameras.main.roundPixels = true
        frameRoom(this, mapWidth, mapHeight, player)
        dialogue = createDialogueBox(this)

        const heading = this.add
          .text(12, 10, 'CENTRO DE CONVIVÊNCIA  •  QUEST 03', {
            fontFamily: 'monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#fff7ec',
            backgroundColor: '#1e3550ef',
            padding: { x: 9, y: 7 },
          })
          .setScrollFactor(0)
          .setDepth(1950)
        const controlsHeading = this.add
          .text(12, 44, 'SETAS: andar   E: interagir   M: mapa   ESC: pausa', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#e7f3ff',
            backgroundColor: '#1e3550e6',
            padding: { x: 7, y: 5 },
          })
          .setScrollFactor(0)
          .setDepth(1950)
        const missionStatus = this.add
          .text(12, 74, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffedb1',
            backgroundColor: '#203650eb',
            padding: { x: 8, y: 6 },
          })
          .setScrollFactor(0)
          .setDepth(1950)
        updateMissionStatus = (): void => {
          missionStatus.setText(
            options.isReopened()
              ? 'QUEST 3 CONCLUIDA  •  SIGA AO BLOCO DE TECNOLOGIA'
              : options.isQuestUnlocked()
                ? 'QUEST 3 LIBERADA  •  PROCURE SEU RAIMUNDO [E]'
                : 'QUEST 3 BLOQUEADA  •  CONCLUA A QUEST 2 NA BIBLIOTECA',
          )
        }
        updateMissionStatus()
        actionHint = this.add
          .text(this.scale.width / 2, this.scale.height - 23, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#1b304ddf',
            padding: { x: 15, y: 7 },
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(1950)
          .setVisible(false)
        actionMarker = this.add
          .circle(0, 0, 4, 0xfff4bd)
          .setStrokeStyle(1, 0x2a3a45)
          .setDepth(1950)
          .setVisible(false)
        // HUD screen-space position is independent of the RPG camera's 1.45x zoom.
        // Without inverse scaling + inverse positioning, text near x=12 or the
        // bottom of the screen is clipped even though its backing box is visible.
        const fixHud = (): void => {
          const z = this.cameras.main.zoom || 1
          const midX = this.cameras.main.width / 2
          const midY = this.cameras.main.height / 2
          const position = (item: Phaser.GameObjects.Text, x: number, y: number): void => {
            item.setPosition(midX + (x - midX) / z, midY + (y - midY) / z)
            item.setScale(1 / z)
          }
          position(heading, 12, 10)
          position(controlsHeading, 12, 44)
          position(missionStatus, 12, 74)
          if (actionHint !== undefined) {
            position(actionHint, this.scale.width / 2, this.scale.height - 23)
          }
        }
        fixHud()
        this.scale.on('resize', fixHud)
        this.events.once('shutdown', () => this.scale.off('resize', fixHud))

        // M opens a full-building wayfinding map. It is a HUD overlay, not a
        // teleport or a separate level: return to exactly the same position.
        overview = this.add.container(0, 0).setScrollFactor(0).setDepth(2500).setVisible(false)
        // Overview children already use virtual screen coordinates. Cancel the
        // world camera zoom around the viewport centre for the entire container.
        const overviewZoom = this.cameras.main.zoom || 1
        overview
          .setPosition(
            (this.scale.width / 2) * (1 - 1 / overviewZoom),
            (this.scale.height / 2) * (1 - 1 / overviewZoom),
          )
          .setScale(1 / overviewZoom)
        overview.add(
          this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x071624,
            0.9,
          ),
        )
        const overviewScale = Math.min(
          (this.scale.width - 90) / mapWidth,
          (this.scale.height - 85) / mapHeight,
        )
        overview.add(
          this.add
            .image(this.scale.width / 2, this.scale.height / 2 + 12, 'cc-overview')
            .setDisplaySize(
              Math.round(mapWidth * overviewScale),
              Math.round(mapHeight * overviewScale),
            ),
        )
        overviewDot = this.add
          .circle(this.scale.width / 2, this.scale.height / 2, 5, 0xffe994)
          .setStrokeStyle(2, 0x203f63)
        overview.add(overviewDot)
        overview.add(
          this.add
            .text(this.scale.width / 2, 14, 'MAPA DO CC  •  PORTÃO SUL / PORTÃO NORTE', {
              fontFamily: 'monospace',
              fontSize: '15px',
              fontStyle: 'bold',
              color: '#ffffff',
              backgroundColor: '#172a42e8',
              padding: { x: 8, y: 6 },
            })
            .setOrigin(0.5, 0),
        )
        overview.add(
          this.add
            .text(this.scale.width / 2, this.scale.height - 12, 'PRESSIONE M PARA VOLTAR AO JOGO', {
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#ffffff',
              backgroundColor: '#172a42ef',
              padding: { x: 9, y: 5 },
            })
            .setOrigin(0.5, 1),
        )
        this.input.keyboard?.on('keydown-M', () => {
          if (dialogue?.active) return
          overviewActive = !overviewActive
          if (overviewActive && player !== undefined) {
            overviewDot?.setPosition(
              this.scale.width / 2 + (player.x - mapWidth / 2) * overviewScale,
              this.scale.height / 2 + 12 + (player.y - mapHeight / 2) * overviewScale,
            )
          }
          overview?.setVisible(overviewActive)
          actionHint?.setVisible(!overviewActive && (nearRaimundo || nearExit !== undefined))
        })
        cursors = this.input.keyboard?.createCursorKeys()
        createPauseMenu(this, { isBlocked: () => dialogue?.active === true || overviewActive })
        this.input.keyboard?.on('keydown-E', () => {
          const current = player
          if (dialogue?.active || overviewActive || current === undefined) return
          // Calculate proximity on the exact E press; the player's previous-frame
          // state can be stale if the key was pressed just as they approached.
          const talkingToRaimundo =
            raimundo !== undefined &&
            Math.hypot(current.x - raimundo.x, current.y - raimundo.y) < RAIMUNDO_TALK_DISTANCE
          const exit = EXITS.find(
            (door) => Math.hypot(current.x - door.x, current.y - door.y) < EXIT_DISTANCE,
          )
          if (talkingToRaimundo) {
            // Completion wins over the generic quest lookup: completed quests stay
            // replayable in questOfferedBy, but a routine chat must never reopen
            // the code editor after the CC queue has already been fixed.
            if (options.isReopened()) {
              dialogue?.show(
                [
                  {
                    speaker: 'Seu Raimundo',
                    text: 'A fila está organizada! Obrigado pela ajuda. Agora siga para o Bloco de Tecnologia e encontre a origem do NULL.',
                  },
                ],
                () => {},
              )
            } else {
              const conversation = options.onTalkToNpc('Seu Raimundo')
              if (conversation !== undefined) dialogue?.show(conversation.offer, conversation.open)
              else
                dialogue?.show(
                  [
                    {
                      speaker: 'Seu Raimundo',
                      text: 'Converse antes com Dona Célia na Biblioteca. Depois vamos arrumar a fila do CC!',
                    },
                  ],
                  () => {},
                )
            }
          } else if (exit !== undefined) {
            // The doors return to opposite sides of the CC on the campus: the front door
            // south of the facade, the north one behind it (campus-assets.generated.ts).
            this.registry.set(
              'campus:returnTo',
              exit.name === 'Saída norte'
                ? CAMPUS_ENTRANCES['centro-de-convivencia:norte']
                : CAMPUS_ENTRANCES['centro-de-convivencia'],
            )
            this.scene.start('campus')
          }
        })
        this.events.once('shutdown', () => {
          playersReset()
        })
        function playersReset() {
          students = []
          player = undefined
          cursors = undefined
          nearExit = undefined
          nearRaimundo = false
          overviewActive = false
          overview = undefined
          playerShadow = undefined
          collisionDebug = undefined
          overviewDot = undefined
          dialogue = undefined
        }
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) return
        if (!aligned && options.isReopened() && (options.canPlayCompletion?.() ?? true)) {
          aligned = true
          updateMissionStatus()
          turnstileTurnsGreen(this, turnstile)
          queueDot?.setFillStyle(0x36be77)
          queueStatus?.setText('FILA • ORGANIZADA').setBackgroundColor('#20744bdc')
          queueGuide?.clear().lineStyle(3, 0x7df1a7, 0.65).lineBetween(823, 345, 823, 493)
          for (const [index, student] of students.entries()) {
            const next = PEOPLE[index]
            if (!next) continue
            this.tweens.add({
              targets: student.sprite,
              x: next.end[0],
              y: next.end[1],
              duration: 900 + 200 * index,
              ease: 'Sine.easeInOut',
              onUpdate: () => student.sprite.setDepth(100 + student.sprite.y + 16),
            })
          }
          const toast = this.add
            .text(this.scale.width / 2, 94, '✓ FILA ORGANIZADA! NOVO ACESSO LIBERADO', {
              fontFamily: 'monospace',
              fontStyle: 'bold',
              fontSize: '19px',
              color: '#d8ffe9',
              backgroundColor: '#126447ef',
              padding: { x: 12, y: 9 },
            })
            .setOrigin(0.5)
            .setDepth(1950)
            .setScrollFactor(0)
            .setAlpha(0)
          // Counter the camera zoom, like the rest of the HUD, or it lands off-screen.
          const z = this.cameras.main.zoom || 1
          toast
            .setPosition(
              this.cameras.main.width / 2,
              this.cameras.main.height / 2 + (150 - this.cameras.main.height / 2) / z,
            )
            .setScale(1 / z)
          this.tweens.add({ targets: toast, alpha: 1, duration: 240, hold: 1900, yoyo: true })
        }

        if (dialogue?.active || overviewActive) return
        const previousX = player.x
        const previousY = player.y
        // Keep the existing walk-cycle controller, but resolve motion in small
        // independent X/Y steps. This prevents tunnelling through narrow props,
        // makes diagonal approaches slide along counters, and stops rubber-banding.
        movePlayer(player, cursors, SPEED, Math.min(this.game.loop.delta, 45) / 1000)
        const intendedX = player.x - previousX
        const intendedY = player.y - previousY
        player.setPosition(previousX, previousY)
        const blocked = (x: number, y: number): boolean => {
          const box = feetBoxAt(x, y)
          const corners: readonly (readonly [number, number])[] = [
            [box.x, box.y],
            [box.x + box.width, box.y],
            [box.x, box.y + box.height],
            [box.x + box.width, box.y + box.height],
          ]
          return (
            corners.some(([px, py]) => !insideFloor(px, py)) ||
            obstacles.some((furniture) => overlapsFurniture(box, furniture)) ||
            (raimundo !== undefined && rectsOverlap(box, npcBox(raimundo))) ||
            students.some(({ sprite }) =>
              rectsOverlap(box, {
                x: sprite.x - 11,
                y: sprite.y + 4,
                width: 22,
                height: 9,
              }),
            )
          )
        }
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(intendedX), Math.abs(intendedY)) / 3))
        for (let i = 0; i < steps; i++) {
          const nextX = player.x + intendedX / steps
          const nextY = player.y + intendedY / steps
          if (!blocked(nextX, player.y)) player.x = nextX
          if (!blocked(player.x, nextY)) player.y = nextY
        }
        player.setDepth(100 + player.y + 16)
        playerShadow?.setPosition(player.x, player.y + 13).setDepth(100 + player.y + 12)
        for (const student of students) student.sprite.setDepth(100 + student.sprite.y + 16)
        // Footstep puffs are decorative and only appear after actual movement.
        if (
          Math.hypot(player.x - previousX, player.y - previousY) > 0.4 &&
          this.time.now - lastFootstepAt > 190
        ) {
          lastFootstepAt = this.time.now
          const dust = this.add
            .ellipse(player.x, player.y + 13, 6, 3, 0xc4b5a2, 0.42)
            .setDepth(100 + player.y + 10)
          this.tweens.add({
            targets: dust,
            alpha: 0,
            scale: 1.75,
            duration: 330,
            onComplete: () => dust.destroy(),
          })
        }
        nearRaimundo =
          raimundo !== undefined &&
          Math.hypot(player.x - raimundo.x, player.y - raimundo.y) < RAIMUNDO_TALK_DISTANCE
        const currentX = player.x
        const currentY = player.y
        nearExit = EXITS.find(
          (exit) => Math.hypot(currentX - exit.x, currentY - exit.y) < EXIT_DISTANCE,
        )
        const hint = nearRaimundo
          ? options.isReopened()
            ? 'E  CONVERSAR COM SEU RAIMUNDO (QUEST 3 CONCLUÍDA)'
            : options.isQuestUnlocked()
              ? 'E  INICIAR QUEST 3 COM SEU RAIMUNDO'
              : 'E  FALE COM SEU RAIMUNDO (QUEST 2 PENDENTE)'
          : nearExit?.label
            ? `E  ${nearExit.label}`
            : ''
        actionHint?.setText(hint).setVisible(hint.length > 0)
        if (actionMarker !== undefined) {
          const target =
            nearRaimundo && raimundo !== undefined
              ? { x: raimundo.x, y: raimundo.y - 30 }
              : nearExit
                ? { x: nearExit.x, y: nearExit.y - 24 }
                : undefined
          actionMarker.setVisible(target !== undefined)
          if (target !== undefined) actionMarker.setPosition(target.x, target.y)
        }
      },
    },
  }
}

/** The red light goes out and the green one comes on, with a short blink to draw the eye. */
function turnstileTurnsGreen(
  scene: Phaser.Scene,
  turnstile: Phaser.GameObjects.Image | undefined,
): void {
  if (turnstile === undefined) return
  turnstile.setTexture(TURNSTILE_OK)
  scene.tweens.add({ targets: turnstile, alpha: 0.4, duration: 120, yoyo: true, repeat: 2 })
}
