import type Phaser from 'phaser'
import { playSfx, preloadAudio } from '../audio/music.js'

const SELECT_SFX_KEY = 'pause-select'
const CONFIRM_SFX_KEY = 'pause-confirm'
const DEPTH = 2000

export type PauseMenu = {
  /** True while the overlay is up — gates whatever else a scene does with its own keys. */
  active: boolean
}

export function preloadPauseMenuAudio(scene: Phaser.Scene): void {
  preloadAudio(scene, SELECT_SFX_KEY, 'audio/sfx/interface/select_001.ogg')
  preloadAudio(scene, CONFIRM_SFX_KEY, 'audio/sfx/interface/confirmation_001.ogg')
}

/**
 * The pause overlay (ADR 0062): Esc owns it outright in every gameplay scene, which is why
 * leaving a room moved from Esc to a door object (`door.ts`) — two different actions can't
 * share one key. Arrows + Enter and mouse both drive it, same accessibility call as the
 * title screen (`menu-scene.ts`).
 *
 * "Voltar ao menu inicial" restarts the whole scene plan at `menu` rather than trying to
 * unwind whatever state the current scene is holding — the honest way to "quit to title"
 * without leaving a half-torn-down scene behind.
 */
export function createPauseMenu(
  scene: Phaser.Scene,
  options: { isBlocked?: () => boolean } = {},
): PauseMenu {
  const width = scene.scale.width
  const height = scene.scale.height
  const centerX = width / 2
  const centerY = height / 2

  const menu: PauseMenu = { active: false }

  const background = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH).setVisible(false)
  background.fillStyle(0x1d1f2b, 0.85)
  background.fillRect(0, 0, width, height)

  const title = scene.add
    .text(centerX, centerY - 70, 'Pausado', {
      fontFamily: 'monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#e8e8f0',
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(DEPTH + 1)
    .setVisible(false)

  type Option = { label: string; onConfirm: () => void }

  const options_: Option[] = [
    { label: 'Continuar', onConfirm: () => close() },
    { label: 'Voltar ao menu inicial', onConfirm: () => scene.scene.start('menu') },
  ]

  let selected = 0

  const entries = options_.map((option, index) => {
    const text = scene.add
      .text(centerX, centerY + index * 40, option.label, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false)
    text.setInteractive({ useHandCursor: true })
    text.on('pointerover', () => {
      selected = index
      render()
    })
    text.on('pointerdown', () => confirmSelected())
    return { option, text }
  })

  const elements = [background, title, ...entries.map((entry) => entry.text)]

  const render = (): void => {
    for (const [index, entry] of entries.entries()) {
      const isSelected = index === selected
      entry.text.setColor(isSelected ? '#7aa2ff' : '#e8e8f0')
      entry.text.setText(isSelected ? `> ${entry.option.label}` : entry.option.label)
    }
  }

  const open = (): void => {
    menu.active = true
    selected = 0
    for (const element of elements) {
      element.setVisible(true)
    }
    render()
  }

  const close = (): void => {
    menu.active = false
    for (const element of elements) {
      element.setVisible(false)
    }
  }

  const move = (delta: number): void => {
    const next = (selected + delta + entries.length) % entries.length
    if (next === selected) {
      return
    }
    selected = next
    playSfx(scene, SELECT_SFX_KEY, 0.4)
    render()
  }

  const confirmSelected = (): void => {
    playSfx(scene, CONFIRM_SFX_KEY)
    entries[selected]?.option.onConfirm()
  }

  scene.input.keyboard?.on('keydown-ESC', () => {
    if (menu.active) {
      close()
      return
    }
    if (options.isBlocked?.() === true) {
      return
    }
    open()
  })
  scene.input.keyboard?.on('keydown-UP', () => {
    if (menu.active) {
      move(-1)
    }
  })
  scene.input.keyboard?.on('keydown-DOWN', () => {
    if (menu.active) {
      move(1)
    }
  })
  scene.input.keyboard?.on('keydown-ENTER', () => {
    if (menu.active) {
      confirmSelected()
    }
  })

  return menu
}
