import type { DialogueLine } from '@unifor-quest/core'
import type Phaser from 'phaser'

const BOX_HEIGHT = 96
const BOX_MARGIN = 12
const DEPTH = 1000

export type DialogueBox = {
  /** True while lines are being shown — gates the NPC's own "talk" keypress from re-triggering. */
  active: boolean
  /** Shows `lines` one at a time, E to advance; calls `onDone` once the last one is dismissed. */
  show: (lines: readonly DialogueLine[], onDone: () => void) => void
}

/**
 * A classic RPG text box: the conversation itself, kept separate from opening the quest's
 * code editor (ADR 0059 covers which quest opens; this is just how the player reads what
 * the NPC says first). Fixed to the camera, drawn above everything else in the scene.
 */
export function createDialogueBox(scene: Phaser.Scene): DialogueBox {
  const width = scene.scale.width
  const top = scene.scale.height - BOX_HEIGHT - BOX_MARGIN

  const background = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH)
  background.fillStyle(0x1d1f2b, 0.92)
  background.fillRect(BOX_MARGIN, top, width - BOX_MARGIN * 2, BOX_HEIGHT)

  const speakerText = scene.add
    .text(BOX_MARGIN * 2, top + 10, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#7aa2ff',
    })
    .setScrollFactor(0)
    .setDepth(DEPTH + 1)

  const lineText = scene.add
    .text(BOX_MARGIN * 2, top + 32, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#e8e8f0',
      wordWrap: { width: width - BOX_MARGIN * 4 },
    })
    .setScrollFactor(0)
    .setDepth(DEPTH + 1)

  const hintText = scene.add
    .text(width - BOX_MARGIN * 2, top + BOX_HEIGHT - 20, 'E para continuar', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#6b7099',
    })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(DEPTH + 1)

  const elements = [background, speakerText, lineText, hintText]
  for (const element of elements) {
    element.setVisible(false)
  }

  const box: DialogueBox = { active: false, show: () => {} }

  box.show = (lines, onDone) => {
    let index = 0
    box.active = true
    for (const element of elements) {
      element.setVisible(true)
    }

    const render = (): void => {
      const line = lines[index]
      if (line === undefined) {
        for (const element of elements) {
          element.setVisible(false)
        }
        box.active = false
        onDone()
        return
      }
      speakerText.setText(line.speaker)
      lineText.setText(line.text)
    }

    const advance = (): void => {
      index += 1
      render()
      if (!box.active) {
        scene.input.keyboard?.off('keydown-E', advance)
      }
    }

    render()
    // Armed next tick: the keydown-E that opened this conversation must not also advance it.
    scene.time.delayedCall(0, () => scene.input.keyboard?.on('keydown-E', advance))
  }

  return box
}
