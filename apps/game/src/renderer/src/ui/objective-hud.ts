import { type Progress, type Quest, questChecklist } from '@unifor-quest/core'
import './objective-hud.css'

export type ObjectiveHud = {
  element: HTMLElement
  /** Call after `progress` changes, so the checklist reflects what was just completed. */
  refresh: () => void
  /** Reveals the HUD — hidden until the player actually starts playing (ADR 0063). */
  show: () => void
}

/**
 * "What do I do now": a checklist of the current phase's quests, completed ones struck
 * through, the one(s) available now highlighted. Reuses `questChecklist` (ADR 0063), which
 * already leaves out anything not available yet — no spoilers here, no new state to track.
 */
export function createObjectiveHud(
  quests: readonly Quest[],
  getProgress: () => Progress,
): ObjectiveHud {
  const root = document.createElement('aside')
  root.className = 'objective-hud'
  root.hidden = true
  root.innerHTML = `
    <p class="objective-hud__title">Objetivo</p>
    <ul class="objective-hud__list"></ul>
  `

  const list = root.querySelector('.objective-hud__list')
  if (list === null) {
    throw new Error('missing element: .objective-hud__list')
  }

  const refresh = (): void => {
    const entries = questChecklist(quests, getProgress())
    list.innerHTML = entries
      .map((entry) => {
        const css = entry.completed
          ? 'objective-hud__item--completed'
          : 'objective-hud__item--current'
        const mark = entry.completed ? '✓' : '▸'
        return `<li class="objective-hud__item ${css}">${mark} ${escapeHtml(entry.quest.objective)}</li>`
      })
      .join('')
  }

  refresh()

  return {
    element: root,
    refresh,
    show: () => {
      root.hidden = false
    },
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  )
}
