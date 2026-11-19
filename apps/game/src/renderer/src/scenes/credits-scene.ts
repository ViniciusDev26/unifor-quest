import type Phaser from 'phaser'
import type { CreditsSection } from '../content/credits.js'

const KEY = 'creditos'
/** Pixels per second: slow enough to read a line, short enough to fit the 2 minutes of
 * opening and ending together (docs/story.md, "Ritmo"). */
const SCROLL_SPEED = 40
const HOLD_AT_END_MS = 2500
const SECTION_GAP = 36
const LINE_GAP = 26

export type CreditsScene = {
  config: Phaser.Types.Scenes.SettingsConfig & {
    create: (this: Phaser.Scene) => void
  }
}

/**
 * The end of the game (ADR 0076): "FIM", then the credits rolling up, then the title
 * screen. It is the epilogue's `creditos` cue that starts it, never a door or a menu.
 *
 * Enter, Esc or a click skip straight to the menu: the cutscenes before it cannot be
 * skipped (ADR 0066), but the credits are not story. The track that was playing on the
 * campus keeps playing — the campus's own music, back to normal (ADR 0070).
 */
export function createCreditsScene(
  sections: readonly CreditsSection[],
  /** Called as the credits start: the gameplay HUD has no place over them. */
  options: { onStart?: () => void } = {},
): CreditsScene {
  return {
    config: {
      key: KEY,

      create(this: Phaser.Scene) {
        options.onStart?.()
        const centerX = this.scale.width / 2
        this.cameras.main.setBackgroundColor('#0d0f17')
        this.cameras.main.fadeIn(800, 0, 0, 0)

        const roll = this.add.container(0, this.scale.height + 20)
        let y = 0
        const add = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle): void => {
          roll.add(this.add.text(centerX, y, text, style).setOrigin(0.5, 0))
        }

        add('FIM', {
          fontFamily: 'monospace',
          fontSize: '48px',
          fontStyle: 'bold',
          color: '#7aa2ff',
        })
        y += 48 + SECTION_GAP * 2

        for (const section of sections) {
          add(section.heading, {
            fontFamily: 'monospace',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#b5ffe1',
          })
          y += LINE_GAP + 8
          for (const line of section.lines) {
            add(line, { fontFamily: 'monospace', fontSize: '15px', color: '#e8e8f0' })
            y += LINE_GAP
          }
          y += SECTION_GAP
        }

        // Stops with the last line in the middle of the screen, then holds it there.
        const distance = this.scale.height / 2 + 20 + y
        let finished = false
        const toMenu = (): void => {
          if (finished) return
          finished = true
          this.cameras.main.fadeOut(600, 0, 0, 0)
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('menu'))
        }

        this.tweens.add({
          targets: roll,
          y: roll.y - distance,
          duration: (distance / SCROLL_SPEED) * 1000,
          onComplete: () => this.time.delayedCall(HOLD_AT_END_MS, toMenu),
        })

        this.add
          .text(this.scale.width - 12, this.scale.height - 10, 'ENTER: voltar ao menu', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#4a4e66',
          })
          .setOrigin(1, 1)

        this.input.keyboard?.on('keydown-ENTER', toMenu)
        this.input.keyboard?.on('keydown-ESC', toMenu)
        this.input.on('pointerdown', toMenu)
      },
    },
  }
}
