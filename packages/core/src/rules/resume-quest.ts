import type { Quest } from '../entities/quest.js'
import type { Progress } from '../value-objects/progress.js'
import { isQuestAvailable, isQuestCompleted } from './quest-availability.js'

/**
 * The quest a loaded game picks up from (ADR 0077): the first one in story order that is
 * available and not completed yet. With every quest done, it is the last completed one —
 * the game resumes where it ended, and whatever is still due there (the ending) plays.
 *
 * `undefined` only when nothing was ever done and nothing is available, which no real save
 * holds: there is a save only after a completed quest (ADR 0020).
 */
export function resumeQuest(quests: readonly Quest[], progress: Progress): Quest | undefined {
  const next = quests.find(
    (quest) => !isQuestCompleted(quest, progress) && isQuestAvailable(quest, progress),
  )
  if (next !== undefined) {
    return next
  }
  return [...quests].reverse().find((quest) => isQuestCompleted(quest, progress))
}
