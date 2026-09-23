import type { Quest } from '../entities/quest.js'
import type { Effect } from '../value-objects/effect.js'
import type { Progress } from '../value-objects/progress.js'

export type Completion = {
  progress: Progress
  /** What the world should do about it. Empty on a replay. */
  effects: Effect[]
  /** False when the quest was already completed before this run (ADR 0030). */
  completedNow: boolean
}

/**
 * Marks a quest as completed and says what the world should do about it.
 *
 * The effects are applied **only the first time**. Replaying a quest to solve it in another
 * language is practice: it does not unlock the door twice (ADR 0030).
 *
 * Nothing here says "quest X is completed" as an effect — that is this function's job, and
 * making every quest declare it would be ceremony that one day gets forgotten (ADR 0034).
 */
export function completeQuest(progress: Progress, quest: Quest): Completion {
  if (progress.completedQuests.includes(quest.id)) {
    return { progress, effects: [], completedNow: false }
  }

  const withQuest: Progress = {
    completedQuests: [...progress.completedQuests, quest.id],
    flags: progress.flags,
  }

  return {
    progress: quest.onSuccess.reduce(applyEffect, withQuest),
    effects: quest.onSuccess,
    completedNow: true,
  }
}

/**
 * Applies one effect to the progress. Effects that only exist on screen leave it untouched;
 * today every effect in the vocabulary touches a flag (ADR 0034).
 */
export function applyEffect(progress: Progress, effect: Effect): Progress {
  switch (effect.kind) {
    case 'setFlag':
      return progress.flags.includes(effect.flag)
        ? progress
        : { completedQuests: progress.completedQuests, flags: [...progress.flags, effect.flag] }

    default: {
      const unreachable: never = effect.kind
      return unreachable
    }
  }
}
