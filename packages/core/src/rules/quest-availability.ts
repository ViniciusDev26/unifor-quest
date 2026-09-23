import type { Quest } from '../entities/quest.js'
import type { Progress } from '../value-objects/progress.js'

/**
 * A quest shows up when everything it depends on is already true: the quests it requires
 * are completed and the world flags it requires are set (ADR 0034).
 *
 * Being completed does **not** make a quest unavailable. The player can reopen it to solve
 * it again in another language (ADR 0030); what changes is that finishing it a second time
 * no longer touches the world.
 */
export function isQuestAvailable(quest: Quest, progress: Progress): boolean {
  const completed = new Set(progress.completedQuests)
  const flags = new Set(progress.flags)

  return (
    quest.requires.quests.every((id) => completed.has(id)) &&
    quest.requires.flags.every((flag) => flags.has(flag))
  )
}

export function availableQuests(quests: readonly Quest[], progress: Progress): Quest[] {
  return quests.filter((quest) => isQuestAvailable(quest, progress))
}

export function isQuestCompleted(quest: Quest, progress: Progress): boolean {
  return progress.completedQuests.includes(quest.id)
}
