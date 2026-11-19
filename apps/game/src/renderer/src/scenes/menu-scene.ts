import type Phaser from 'phaser'
import { playMusic, playSfx, preloadAudio } from '../audio/music.js'

const MUSIC_KEY = 'menu-title-screen'
const SELECT_SFX_KEY = 'menu-select'
const CONFIRM_SFX_KEY = 'menu-confirm'

/**
 * What is on disk, as far as the menu cares (ADR 0072). Only `ok` can be loaded; the others
 * say why "Carregar jogo" is off.
 */
export type SaveStatus = 'ok' | 'missing' | 'newer' | 'invalid'

export type MenuScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    preload: (this: Phaser.Scene) => void
    create: (this: Phaser.Scene) => void
  }
}

type MenuOption = {
  label: string
  enabled: boolean
  onConfirm: (() => void) | undefined
}

const LOAD_LABEL: Readonly<Record<SaveStatus, string>> = {
  ok: 'Carregar jogo',
  missing: 'Carregar jogo (nenhum jogo salvo)',
  newer: 'Carregar jogo (salvo por uma versao mais nova)',
  invalid: 'Carregar jogo (arquivo de save invalido)',
}

/**
 * The title screen — the real boot scene, before the player ever sees the portaria
 * (ADR 0062). Keyboard (arrows + Enter) and mouse both drive it, never one exclusive of
 * the other — the accessibility call the project made for this screen.
 *
 * "Carregar jogo" resumes the one save there is (ADR 0072, 0077); it is shown but off when
 * there is nothing to load, with the reason next to it. "Iniciar novo jogo" over a save asks
 * first, because confirming deletes it: it is the only way to lose a save on purpose.
 */
export function createMenuScene(options: {
  saveStatus: () => SaveStatus
  /** Resets the game, deleting the save when there is one. Resolves when it is done. */
  onStartNewGame: () => Promise<void>
  /** Puts the save in place and says which scene to resume in. */
  onLoadGame: (scene: Phaser.Scene) => string
  /** Called whenever the title screen comes up: the gameplay HUD has no place on it. */
  onShow?: () => void
}): MenuScene {
  return {
    config: {
      key: 'menu',

      preload(this: Phaser.Scene) {
        preloadAudio(this, MUSIC_KEY, 'audio/music/rpgchip01_title_screen.ogg')
        preloadAudio(this, SELECT_SFX_KEY, 'audio/sfx/interface/select_001.ogg')
        preloadAudio(this, CONFIRM_SFX_KEY, 'audio/sfx/interface/confirmation_001.ogg')
      },

      create(this: Phaser.Scene) {
        options.onShow?.()
        playMusic(this, MUSIC_KEY)

        const centerX = this.scale.width / 2
        const centerY = this.scale.height / 2

        this.add
          .text(centerX, centerY - 140, 'UNIFOR QUEST', {
            fontFamily: 'monospace',
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#7aa2ff',
          })
          .setOrigin(0.5)

        this.add
          .text(centerX, centerY - 90, 'um dia contra o NULL', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#9aa0be',
          })
          .setOrigin(0.5)

        const notice = this.add
          .text(centerX, centerY - 40, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#f2c879',
            align: 'center',
          })
          .setOrigin(0.5)

        let busy = false
        const startNewGame = (): void => {
          if (busy) return
          busy = true
          playSfx(this, CONFIRM_SFX_KEY)
          void options.onStartNewGame().then(() => this.scene.start('entrada'))
        }

        const mainOptions = (): MenuOption[] => {
          const status = options.saveStatus()
          return [
            {
              label: 'Iniciar novo jogo',
              enabled: true,
              // With nothing saved there is nothing to lose, so no question either.
              onConfirm: () => (status === 'ok' ? show('confirm') : startNewGame()),
            },
            {
              label: LOAD_LABEL[status],
              enabled: status === 'ok',
              onConfirm: () => {
                playSfx(this, CONFIRM_SFX_KEY)
                this.scene.start(options.onLoadGame(this))
              },
            },
          ]
        }

        const confirmOptions = (): MenuOption[] => [
          { label: 'Voltar', enabled: true, onConfirm: () => show('main') },
          { label: 'Apagar e comecar de novo', enabled: true, onConfirm: startNewGame },
        ]

        let entries: { option: MenuOption; text: Phaser.GameObjects.Text }[] = []
        let selected = 0

        const render = (): void => {
          for (const [index, entry] of entries.entries()) {
            if (!entry.option.enabled) {
              entry.text.setColor('#4a4e66').setText(entry.option.label)
              continue
            }
            const isSelected = index === selected
            entry.text.setColor(isSelected ? '#7aa2ff' : '#e8e8f0')
            entry.text.setText(isSelected ? `> ${entry.option.label}` : entry.option.label)
          }
        }

        /** Swaps the list on screen: the title menu, or the question before a new game. */
        const show = (mode: 'main' | 'confirm'): void => {
          for (const entry of entries) entry.text.destroy()
          notice.setText(
            mode === 'confirm' ? 'Comecar de novo apaga o jogo salvo.\nIsso nao tem volta.' : '',
          )
          const list = mode === 'confirm' ? confirmOptions() : mainOptions()
          entries = list.map((option, index) => {
            const text = this.add
              .text(centerX, centerY + index * 40, option.label, {
                fontFamily: 'monospace',
                fontSize: '20px',
                color: '#e8e8f0',
              })
              .setOrigin(0.5)
            text.setInteractive({ useHandCursor: option.enabled })
            text.on('pointerover', () => {
              if (!option.enabled) return
              selected = index
              render()
            })
            text.on('pointerdown', () => {
              if (!option.enabled) return
              selected = index
              confirm()
            })
            return { option, text }
          })
          // The safe answer is the one under the cursor when the question comes up.
          selected = 0
          render()
        }

        const move = (delta: number): void => {
          let next = selected
          do {
            next = (next + delta + entries.length) % entries.length
          } while (next !== selected && entries[next]?.option.enabled !== true)
          if (next === selected) {
            return
          }
          selected = next
          playSfx(this, SELECT_SFX_KEY, 0.4)
          render()
        }

        const confirm = (): void => {
          const entry = entries[selected]
          if (entry?.option.enabled === true) {
            entry.option.onConfirm?.()
          }
        }

        this.input.keyboard?.on('keydown-UP', () => move(-1))
        this.input.keyboard?.on('keydown-DOWN', () => move(1))
        this.input.keyboard?.on('keydown-ENTER', () => confirm())

        show('main')
      },
    },
  }
}
