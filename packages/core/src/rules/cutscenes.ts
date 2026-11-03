import type { Cutscene } from '../entities/cutscene.js'
import type { Progress } from '../value-objects/progress.js'
import { requirementsMet } from '../value-objects/requirements.js'

/**
 * The cutscene that should play now in `scene`, if any (ADR 0066): the first one, in
 * `cutscenes` order, whose `requires` holds and that the player has not watched yet.
 *
 * The scene asks when it is created and whenever progress changes, which covers both an
 * opening (requires nothing, plays on entering) and an ending (requires the last quest,
 * plays right after it) without a separate notion of trigger.
 */
export function pendingCutscene(
  cutscenes: readonly Cutscene[],
  scene: string,
  progress: Progress,
): Cutscene | undefined {
  return cutscenes.find(
    (cutscene) =>
      cutscene.scene === scene &&
      !progress.seenCutscenes.includes(cutscene.id) &&
      requirementsMet(cutscene.requires, progress),
  )
}

/** Records that a cutscene finished, so it never plays again in this save. */
export function markCutsceneSeen(progress: Progress, cutscene: Cutscene): Progress {
  if (progress.seenCutscenes.includes(cutscene.id)) {
    return progress
  }
  return { ...progress, seenCutscenes: [...progress.seenCutscenes, cutscene.id] }
}
