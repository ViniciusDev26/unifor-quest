import type Phaser from 'phaser'

export type WorldScene = {
  config: Phaser.Types.Scenes.SettingsConfig & { create: (this: Phaser.Scene) => void }
  /** Renders what the domain decided. The scene itself decides nothing (ADR 0027). */
  showCompleted: (flags: readonly string[]) => void
}

/**
 * The world, such as it is. Phase A has no campus and no art (ADR 0029): the scene exists
 * so the player has somewhere to stand and someone to talk to.
 *
 * Built as a closure over its own text objects instead of a subclass: the scene is
 * configuration plus functions, and nothing here inherits from anything.
 */
export function createWorldScene(options: { onTalk: () => void }): WorldScene {
  let hint: Phaser.GameObjects.Text | undefined
  let status: Phaser.GameObjects.Text | undefined

  return {
    config: {
      key: 'world',

      create(this: Phaser.Scene) {
        const centerX = this.scale.width / 2
        const centerY = this.scale.height / 2

        this.add
          .text(centerX, centerY - 60, 'UNIFOR Quest', {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: '#e8e8f0',
          })
          .setOrigin(0.5)

        this.add
          .text(centerX, centerY - 16, 'Monitor', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#7aa2ff',
          })
          .setOrigin(0.5)

        hint = this.add
          .text(centerX, centerY + 24, 'Pressione E para falar', {
            fontFamily: 'monospace',
            fontSize: '15px',
            color: '#9aa0be',
          })
          .setOrigin(0.5)

        status = this.add
          .text(centerX, centerY + 60, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#6ee7a0',
          })
          .setOrigin(0.5)

        this.input.keyboard?.on('keydown-E', options.onTalk)
      },
    },

    showCompleted(flags) {
      hint?.setText('Pressione E para tentar de novo')
      status?.setText(`quest concluida${flags.length > 0 ? ` - ${flags.join(', ')}` : ''}`)
    },
  }
}
