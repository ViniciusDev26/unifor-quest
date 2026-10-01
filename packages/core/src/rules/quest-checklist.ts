import type { Quest } from '../entities/quest.js'
import type { Progress } from '../value-objects/progress.js'
import { isQuestAvailable, isQuestCompleted } from './quest-availability.js'

export type ChecklistEntry = { quest: Quest; completed: boolean }

/**
 * What the HUD shows for "what to do now" (ADR 0063): completed quests and the ones
 * available right now, in the order `quests` was given. A quest not yet available is left
 * out entirely — the checklist is not where the player learns what comes after the current
 * step.
 */
export function questChecklist(quests: readonly Quest[], progress: Progress): ChecklistEntry[] {
  return quests
    .filter((quest) => isQuestCompleted(quest, progress) || isQuestAvailable(quest, progress))
    .map((quest) => ({ quest, completed: isQuestCompleted(quest, progress) }))
}
