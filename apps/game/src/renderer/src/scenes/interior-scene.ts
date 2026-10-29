import type { DialogueLine } from '@unifor-quest/core'
import type Phaser from 'phaser'
import { playMusic, preloadAudio } from '../audio/music.js'
import { frameRoom } from './camera.js'
import { createDialogueBox } from './dialogue-box.js'
import { createDoor, type Door, isNearDoor } from './door.js'
import { createNpc, isNearNpc, type Npc, npcBox, preloadNpcSprite } from './npc.js'
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

const TILE_SIZE = 16
const PLAYER_SPEED = 180

/** A position in tiles of the room's own map — the unit the maps are designed in. */
export type TilePoint = { x: number; y: number }

export type Conversation = {
  offer: readonly DialogueLine[]
  /** Opens whatever quest panel this conversation is leading to. */
  open: () => void
}

export type InteriorNpc = {
  /** The same name the quests use in their `npc` field — that is how a quest finds its NPC. */
  id: string
  /** A 4x4 walk sheet, same convention as the player (`npc.ts`). */
  sprite: string
  at: TilePoint
}

export type InteriorOptions = {
  /** Scene key, and the map it loads: `maps/<key>.tmj`. */
  key: string
  music: { key: string; path: string }
  /** The one line of help pinned to the top-left corner. */
  hint: string
  player: TilePoint
  npcs: readonly InteriorNpc[]
  door: {
    at: TilePoint
    /** Leaving is allowed unless this says otherwise. */
    canLeave?: () => boolean
    /** Shown instead of leaving while `canLeave` is false. */
    locked?: readonly DialogueLine[]
  }
  onTalkToNpc: (npcId: string) => Conversation | undefined
}

export type InteriorScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
    update: (this: Phaser.Scene) => void
  }
}

type PlacedNpc = { id: string; npc: Npc }

/**
 * A room inside a building: every NPC lives in one, never loose on the campus map (ADR
 * 0059). The places differ only in data — map, music, who stands where, whether the door
 * lets you out — so each one is a call to this function, not a copy of a scene.
 *
 * The map draws from `indoor.png` (ADR 0058). No wall tiles in the content data: a room
 * this size draws its border as a plain rectangle here, rather than needing a second flat
 * tile picked from the sheet just for that.
 *
 * Talking to an NPC always plays the conversation first (`createDialogueBox`) — the quest
 * editor only opens once the player has read what they have to say, not the instant E is
 * pressed. Leaving is walking to the door and pressing E, back to `campus`, which spawns the
 * player at the building's own door (it saved that position before switching here). Esc is
 * the pause menu instead (ADR 0062) — the two actions can't share one key.
 */
export function createInteriorScene(options: InteriorOptions): InteriorScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let npcs: PlacedNpc[] = []
  let door: Door | undefined
  let nearNpc: PlacedNpc | undefined
  let nearDoor = false
  let mapWidth = 0
  let mapHeight = 0

  return {
    config: {
      key: options.key,

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON(options.key, `maps/${options.key}.tmj`)
        this.load.image('indoor', 'tilesets/indoor.png')
        preloadPlayer(this)
        for (const npc of options.npcs) {
          preloadNpcSprite(this, spriteKey(npc.id), npc.sprite)
        }
        preloadAudio(this, options.music.key, options.music.path)
        preloadPauseMenuAudio(this)
      },

      create(this: Phaser.Scene) {
        playMusic(this, options.music.key)

        const map = this.add.tilemap(options.key)
        const tileset = map.addTilesetImage('indoor', 'indoor')
        if (tileset !== null) {
          map.createLayer('ground', tileset)
        }
        mapWidth = map.widthInPixels
        mapHeight = map.heightInPixels

        const wall = this.add.graphics()
        wall.lineStyle(TILE_SIZE, 0x4b3f2f, 1)
        wall.strokeRect(TILE_SIZE / 2, TILE_SIZE / 2, mapWidth - TILE_SIZE, mapHeight - TILE_SIZE)

        npcs = options.npcs.map(({ id, at }) => ({
          id,
          npc: createNpc(this, spriteKey(id), at.x * TILE_SIZE, at.y * TILE_SIZE),
        }))

        ensurePlayerAnimations(this)
        player = createPlayer(this, options.player.x * TILE_SIZE, options.player.y * TILE_SIZE)

        door = createDoor(this, options.door.at.x * TILE_SIZE, options.door.at.y * TILE_SIZE)

        frameRoom(this, mapWidth, mapHeight, player)

        this.add
          .text(8, 8, options.hint, {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#e8e8f0',
          })
          .setScrollFactor(0)

        const dialogueBox = createDialogueBox(this)

        cursors = this.input.keyboard?.createCursorKeys()
        createPauseMenu(this, { isBlocked: () => dialogueBox.active })
        this.input.keyboard?.on('keydown-E', () => {
          if (dialogueBox.active) {
            return
          }
          if (nearNpc !== undefined) {
            const conversation = options.onTalkToNpc(nearNpc.id)
            if (conversation !== undefined) {
              dialogueBox.show(conversation.offer, conversation.open)
            }
            return
          }
          if (nearDoor) {
            if (options.door.canLeave?.() ?? true) {
              this.scene.start('campus')
              return
            }
            if (options.door.locked !== undefined) {
              dialogueBox.show(options.door.locked, () => {})
            }
          }
        })
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) {
          return
        }
        const prevX = player.x
        const prevY = player.y
        movePlayer(player, cursors, PLAYER_SPEED, this.game.loop.delta / 1000)

        for (const { npc } of npcs) {
          const box = npcBox(npc)
          const blocked = (x: number, y: number) => rectsOverlap(feetBoxAt(x, y), box)
          if (blocked(player.x, player.y)) {
            if (!blocked(player.x, prevY)) {
              player.y = prevY
            } else if (!blocked(prevX, player.y)) {
              player.x = prevX
            } else {
              player.x = prevX
              player.y = prevY
            }
          }
        }

        clampToRoom(player, mapWidth, mapHeight, TILE_SIZE)
        const { x, y } = player
        nearNpc = npcs.find(({ npc }) => isNearNpc(npc, x, y))
        nearDoor = door !== undefined && isNearDoor(door, x, y)
      },
    },
  }
}

function spriteKey(npcId: string): string {
  return `npc-${npcId}`
}
