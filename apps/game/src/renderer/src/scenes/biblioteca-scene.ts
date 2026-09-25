import type Phaser from 'phaser'
import { createPlayer, ensurePlayerAnimations, movePlayer, preloadPlayer } from './player.js'

const TILE_SIZE = 16
const PLAYER_SPEED = 180

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
 * Leaving (Esc) returns to `campus`, which spawns the player back at the door: the position
 * is saved in the scene registry by `campus-scene` itself, right before switching here.
 */
export function createBibliotecaScene(): BibliotecaScene {
  let player: Phaser.GameObjects.Sprite | undefined
  let cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined

  return {
    config: {
      key: 'biblioteca',

      preload(this: Phaser.Scene) {
        this.load.tilemapTiledJSON('biblioteca', 'maps/biblioteca.tmj')
        this.load.image('indoor', 'tilesets/indoor.png')
        preloadPlayer(this)
      },

      create(this: Phaser.Scene) {
        const map = this.add.tilemap('biblioteca')
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

        ensurePlayerAnimations(this)
        player = createPlayer(this, map.widthInPixels / 2, map.heightInPixels / 2)

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        this.cameras.main.startFollow(player)

        this.add
          .text(8, 8, 'Biblioteca. Esc para sair.', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#e8e8f0',
          })
          .setScrollFactor(0)

        cursors = this.input.keyboard?.createCursorKeys()
        this.input.keyboard?.on('keydown-ESC', () => this.scene.start('campus'))
      },

      update(this: Phaser.Scene) {
        if (player === undefined || cursors === undefined) {
          return
        }
        movePlayer(player, cursors, PLAYER_SPEED, this.game.loop.delta / 1000)
      },
    },
  }
}
