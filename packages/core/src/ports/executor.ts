import type { RunEnvelope } from '../contracts/run-envelope.js'
import type { Challenge } from '../value-objects/challenge.js'
import type { LanguageId } from '../value-objects/language-id.js'
import type { GeneratedFile } from './language-adapter.js'

export type RunRequest = {
  challenge: Challenge
  language: LanguageId
  /** The player's whole project, not just the file with the function (ADR 0047). */
  playerFiles: readonly GeneratedFile[]
}

/**
 * Runs the player's code and always comes back with an envelope — a timeout or a crash is
 * an envelope with `error` set and no results (ADR 0009). Whether the player solved the
 * challenge is not decided here: that is `evaluateSubmission` (ADR 0037).
 */
export interface Executor {
  run(request: RunRequest): Promise<RunEnvelope>
}
