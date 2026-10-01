import type Phaser from 'phaser'
import { playMusic, preloadAudio } from '../audio/music.js'
import { frameRoom } from './camera.js'
import { createDoor, isNearDoor } from './door.js'
import { createPauseMenu, preloadPauseMenuAudio } from './pause-menu.js'
import {
  clampToRoom,
  createPlayer,
  ensurePlayerAnimations,
  movePlayer,
  preloadPlayer,
} from './player.js'

const TILE_SIZE = 16
const PLAYER_SPEED = 180
const MUSIC_KEY = 'biblioteca-theme'

export type BibliotecaScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
    update: (this: Phaser.Scene) => void
  }
}

/**
 * Interior of the Biblioteca: the proof that the same pipeline draws from `indoor.png` too
 * (ADR 0058). No wall tiles in the content data — a room this size draws its border as a
 * plain rectangle here, in the scene, rather than needing a second flat tile picked from
 * the sheet just for that.
 *
 * Leaving means walking to the door and pressing E, which returns to `campus` and spawns
 * the player back at the building's own door (position saved in the scene registry by
 * `campus-scene` itself, right before switching here). Esc is the pause menu instead (ADR
 * 0062) — the two actions can't share one key.
 */
export function createBibliotecaScene(): BibliotecaScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined
  let door: ReturnType<typeof createDoor> | undefined
  let nearDoor = false
  let mapWidth = 0
  let mapHeight = 0

  return {
    config: {
      key: 'biblioteca',

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON('biblioteca', 'maps/biblioteca.tmj')
        this.load.image('indoor', 'tilesets/indoor.png')
        preloadPlayer(this)
        preloadAudio(this, MUSIC_KEY, 'audio/music/rpgchip07_the_shrine_of_mysteries.ogg')
        preloadPauseMenuAudio(this)
      },

      create(this: Phaser.Scene) {
        playMusic(this, MUSIC_KEY)

        const map = this.add.tilemap('biblioteca')
        const tileset = map.addTilesetImage('indoor', 'indoor')
        if (tileset !== null) {
          map.createLayer('ground', tileset)
        }
        mapWidth = map.widthInPixels
        mapHeight = map.heightInPixels

        const wall = this.add.graphics()
        wall.lineStyle(TILE_SIZE, 0x4b3f2f, 1)
        wall.strokeRect(
          TILE_SIZE / 2,
          TILE_SIZE / 2,
          map.widthInPixels - TILE_SIZE,
          map.heightInPixels - TILE_SIZE,
        )

        ensurePlayerAnimations(this)
        player = createPlayer(this, map.widthInPixels / 2, map.heightInPixels / 2)

        door = createDoor(this, map.widthInPixels / 2, map.heightInPixels / 2 + 48)

        frameRoom(this, map.widthInPixels, map.heightInPixels, player)

        this.add
          .text(8, 8, 'Biblioteca. E perto da porta para sair. Esc pausa.', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#e8e8f0',
          })
          .setScrollFactor(0)

        cursors = this.input.keyboard?.createCursorKeys()
        createPauseMenu(this)
        this.input.keyboard?.on('keydown-E', () => {
          if (nearDoor) {
            this.scene.start('campus')
          }
        })
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) {
          return
        }
        movePlayer(player, cursors, PLAYER_SPEED, this.game.loop.delta / 1000)
        clampToRoom(player, mapWidth, mapHeight, TILE_SIZE)
        nearDoor = door !== undefined && isNearDoor(door, player.x, player.y)
      },
    },
  }
}
