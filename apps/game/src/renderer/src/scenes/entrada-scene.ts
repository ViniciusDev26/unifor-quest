import type { DialogueLine } from '@unifor-quest/core'
import type Phaser from 'phaser'
import { createDialogueBox } from './dialogue-box.js'
import { createNpc, isNearNpc, type Npc, preloadNpcSprite } from './npc.js'
import { createPlayer, ensurePlayerAnimations, movePlayer, preloadPlayer } from './player.js'

const TILE_SIZE = 16
const PLAYER_SPEED = 180
const MARCOS_KEY = 'npc-marcos'

export type Conversation = {
  offer: readonly DialogueLine[]
  /** Opens whatever quest panel this conversation is leading to. */
  open: () => void
}

export type EntradaScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
    update: (this: Phaser.Scene) => void
  }
}

/**
 * The entrance guardhouse — Marcos's booth, not the outdoor gate itself (ADR 0059):
 * every NPC lives inside a scenario, never loose on the campus map. Reached by walking up
 * to the gates on `campus` and pressing E, same mechanism as entering the Biblioteca.
 *
 * Talking to Marcos always plays the conversation first (`createDialogueBox`) — the quest
 * editor only opens once the player has read what he has to say, not the instant E is
 * pressed.
 *
 * This is also where the game boots (0061): the player starts inside the guardhouse, and
 * `canLeave` — true once "Placas embaralhadas" sets `minimapa-liberado` — is what turns
 * Esc from a no-op into the way out to the rest of the campus. Passing Marcos is the
 * point, not an afterthought.
 */
export function createEntradaScene(options: {
  onTalkToNpc: (npcId: string) => Conversation | undefined
  canLeave: () => boolean
}): EntradaScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let marcos: Npc | undefined
  let nearMarcos = false

  return {
    config: {
      key: 'entrada',

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON('entrada', 'maps/entrada.tmj')
        this.load.image('indoor', 'tilesets/indoor.png')
        preloadPlayer(this)
        preloadNpcSprite(this, MARCOS_KEY, 'characters/young_guy.png')
      },

      create(this: Phaser.Scene) {
        const map = this.add.tilemap('entrada')
        const tileset = map.addTilesetImage('indoor', 'indoor')
        if (tileset !== null) {
          map.createLayer('ground', tileset)
        }

        const wall = this.add.graphics()
        wall.lineStyle(TILE_SIZE, 0x4b3f2f, 1)
        wall.strokeRect(
          TILE_SIZE / 2,
          TILE_SIZE / 2,
          map.widthInPixels - TILE_SIZE,
          map.heightInPixels - TILE_SIZE,
        )

        marcos = createNpc(this, MARCOS_KEY, map.widthInPixels / 2, map.heightInPixels / 2 - 24)

        ensurePlayerAnimations(this)
        player = createPlayer(this, map.widthInPixels / 2, map.heightInPixels / 2 + 32)

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        this.cameras.main.startFollow(player)

        this.add
          .text(8, 8, 'Portaria. E para falar com o Marcos, Esc para sair.', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#e8e8f0',
          })
          .setScrollFactor(0)

        const dialogueBox = createDialogueBox(this)

        cursors = this.input.keyboard?.createCursorKeys()
        this.input.keyboard?.on('keydown-ESC', () => {
          if (dialogueBox.active) {
            return
          }
          if (options.canLeave()) {
            this.scene.start('campus')
            return
          }
          dialogueBox.show(
            [{ speaker: 'Marcos', text: 'Ainda nao. Resolve a cifra das placas primeiro.' }],
            () => {},
          )
        })
        this.input.keyboard?.on('keydown-E', () => {
          if (dialogueBox.active || !nearMarcos) {
            return
          }
          const conversation = options.onTalkToNpc('marcos')
          if (conversation !== undefined) {
            dialogueBox.show(conversation.offer, conversation.open)
          }
        })
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) {
          return
        }
        movePlayer(player, cursors, PLAYER_SPEED, this.game.loop.delta / 1000)
        nearMarcos = marcos !== undefined && isNearNpc(marcos, player.x, player.y)
      },
    },
  }
}
