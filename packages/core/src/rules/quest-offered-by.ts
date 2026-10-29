import type { Quest } from '../entities/quest.js'
import type { Progress } from '../value-objects/progress.js'
import { isQuestAvailable } from './quest-availability.js'

/**
 * The quest an NPC offers when the player talks to them (ADR 0059): of the quests whose
 * `npc` is this one, the furthest along in `quests` order that is available. That covers
 * both the next thing to do and, once everything is done, the latest one to replay in
 * another language (ADR 0030) — completed quests stay available.
 *
 * `undefined` when the NPC has nothing to offer yet: the scene then has nothing to open.
 */
export function questOfferedBy(
  quests: readonly Quest[],
  npc: string,
  progress: Progress,
): Quest | undefined {
  return [...quests]
    .reverse()
    .find((quest) => quest.npc === npc && isQuestAvailable(quest, progress))
}
