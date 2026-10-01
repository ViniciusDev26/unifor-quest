import type Phaser from 'phaser'
import { playMusic, playSfx, preloadAudio } from '../audio/music.js'

const MUSIC_KEY = 'menu-title-screen'
const SELECT_SFX_KEY = 'menu-select'
const CONFIRM_SFX_KEY = 'menu-confirm'

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

/**
 * The title screen — the real boot scene, before the player ever sees the portaria
 * (ADR 0062). Keyboard (arrows + Enter) and mouse both drive it, never one exclusive of
 * the other — the accessibility call the project made for this screen.
 *
 * "Carregar jogo" is shown but disabled: there is no save file to load yet (autosave
 * triggers on quest completion, ADR 0020, but nothing is written to disk — the format is
 * still an open question, docs/open-questions.md #2). Showing it disabled, instead of
 * hiding it, is the honest state of the feature, not a guess at its future shape.
 */
export function createMenuScene(options: { onStartNewGame?: () => void } = {}): MenuScene {
  return {
    config: {
      key: 'menu',

      preload(this: Phaser.Scene) {
        preloadAudio(this, MUSIC_KEY, 'audio/music/rpgchip01_title_screen.ogg')
        preloadAudio(this, SELECT_SFX_KEY, 'audio/sfx/interface/select_001.ogg')
        preloadAudio(this, CONFIRM_SFX_KEY, 'audio/sfx/interface/confirmation_001.ogg')
      },

      create(this: Phaser.Scene) {
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

        const menuOptions: MenuOption[] = [
          {
            label: 'Iniciar novo jogo',
            enabled: true,
            onConfirm: () => {
              playSfx(this, CONFIRM_SFX_KEY)
              options.onStartNewGame?.()
              this.scene.start('entrada')
            },
          },
          {
            label: 'Carregar jogo (em breve)',
            enabled: false,
            onConfirm: undefined,
          },
        ]

        let selected = 0

        const entries = menuOptions.map((option, index) => {
          const text = this.add
            .text(centerX, centerY + index * 40, option.label, {
              fontFamily: 'monospace',
              fontSize: '20px',
              color: '#e8e8f0',
            })
            .setOrigin(0.5)
          text.setInteractive({ useHandCursor: option.enabled })
          text.on('pointerover', () => {
            selected = index
            render()
          })
          text.on('pointerdown', () => {
            selected = index
            confirm()
          })
          return { option, text }
        })

        const render = (): void => {
          for (const [index, entry] of entries.entries()) {
            if (!entry.option.enabled) {
              entry.text.setColor('#4a4e66')
              continue
            }
            const isSelected = index === selected
            entry.text.setColor(isSelected ? '#7aa2ff' : '#e8e8f0')
            entry.text.setText(isSelected ? `> ${entry.option.label}` : entry.option.label)
          }
        }

        const move = (delta: number): void => {
          const next = (selected + delta + entries.length) % entries.length
          if (next === selected) {
            return
          }
          selected = next
          playSfx(this, SELECT_SFX_KEY, 0.4)
          render()
        }

        const confirm = (): void => {
          entries[selected]?.option.onConfirm?.()
        }

        this.input.keyboard?.on('keydown-UP', () => move(-1))
        this.input.keyboard?.on('keydown-DOWN', () => move(1))
        this.input.keyboard?.on('keydown-ENTER', () => confirm())

        render()
      },
    },
  }
}
