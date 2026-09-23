import type { Challenge } from '../value-objects/challenge.js'
import { type LanguageId, languageIdSchema } from '../value-objects/language-id.js'

/**
 * Which languages a challenge can be solved in.
 *
 * The answer is normally *all of them*: that is the whole point of the adapter abstraction,
 * and a gameplay promise (ADR 0003, ADR 0030).
 *
 * The exception is a challenge with hand-written tests (ADR 0007). Those only cover the
 * languages someone actually wrote them for, and the way a challenge declares that is by
 * shipping a reference solution for each language it supports.
 */
export function languagesFor(challenge: Challenge): LanguageId[] {
  if (!challenge.customTests) {
    return [...languageIdSchema.options]
  }

  return languageIdSchema.options.filter((id) => challenge.referenceSolutions[id] !== undefined)
}
