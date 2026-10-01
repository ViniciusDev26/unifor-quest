import type { DialogueLine } from '@unifor-quest/core'
import type Phaser from 'phaser'
import { playMusic, preloadAudio } from '../audio/music.js'
import { createDialogueBox } from './dialogue-box.js'
import { createDoor, isNearDoor } from './door.js'
import { createNpc, isNearNpc, type Npc, preloadNpcSprite } from './npc.js'
import { createPauseMenu, preloadPauseMenuAudio } from './pause-menu.js'
import { createPlayer, ensurePlayerAnimations, movePlayer, preloadPlayer } from './player.js'

const TILE_SIZE = 16
const PLAYER_SPEED = 180
const MARCOS_KEY = 'npc-marcos'
// Reaproveita o tema calmo do campus (ADR 0062) -- a portaria ainda nao tem trilha propria
// no GDD, e os dois lugares compartilham o mesmo tom "antes de tudo mudar".
const MUSIC_KEY = 'campus-theme'

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
 * `canLeave` — true once "Placas embaralhadas" sets `minimapa-liberado` — is what turns the
 * door from a no-op into the way out to the rest of the campus. Passing Marcos is the
 * point, not an afterthought. Esc is the pause menu here too (ADR 0062), so leaving is tied
 * to the door, not the key that used to do it.
 */
export function createEntradaScene(options: {
  onTalkToNpc: (npcId: string) => Conversation | undefined
  canLeave: () => boolean
}): EntradaScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let marcos: Npc | undefined
  let door: ReturnType<typeof createDoor> | undefined
  let nearMarcos = false
  let nearDoor = false

  return {
    config: {
      key: 'entrada',

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON('entrada', 'maps/entrada.tmj')
        this.load.image('indoor', 'tilesets/indoor.png')
        preloadPlayer(this)
        preloadNpcSprite(this, MARCOS_KEY, 'characters/young_guy.png')
        preloadAudio(this, MUSIC_KEY, 'audio/music/rpgchip03_town.ogg')
        preloadPauseMenuAudio(this)
      },

      create(this: Phaser.Scene) {
        playMusic(this, MUSIC_KEY)

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

        door = createDoor(this, map.widthInPixels / 2, map.heightInPixels / 2 + 64)

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        this.cameras.main.startFollow(player)

        this.add
          .text(8, 8, 'Portaria. E para falar com o Marcos ou sair pela porta. Esc pausa.', {
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
          if (nearMarcos) {
            const conversation = options.onTalkToNpc('marcos')
            if (conversation !== undefined) {
              dialogueBox.show(conversation.offer, conversation.open)
            }
            return
          }
          if (nearDoor) {
            if (options.canLeave()) {
              this.scene.start('campus')
              return
            }
            dialogueBox.show(
              [{ speaker: 'Marcos', text: 'Ainda nao. Resolve a cifra das placas primeiro.' }],
              () => {},
            )
          }
        })
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) {
          return
        }
        movePlayer(player, cursors, PLAYER_SPEED, this.game.loop.delta / 1000)
        nearMarcos = marcos !== undefined && isNearNpc(marcos, player.x, player.y)
        nearDoor = door !== undefined && isNearDoor(door, player.x, player.y)
      },
    },
  }
}
