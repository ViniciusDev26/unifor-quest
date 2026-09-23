import type { RunEnvelope } from '../contracts/run-envelope.js'
import type { Challenge } from '../value-objects/challenge.js'
import type { LanguageId } from '../value-objects/language-id.js'

export type RunRequest = {
  challenge: Challenge
  language: LanguageId
  playerCode: string
}

/**
 * Runs the player's code and always comes back with an envelope — a timeout or a crash is
 * an envelope with `error` set and no results (ADR 0009). Whether the player solved the
 * challenge is not decided here: that is `evaluateSubmission` (ADR 0037).
 */
export interface Executor {
  run(request: RunRequest): Promise<RunEnvelope>
}
