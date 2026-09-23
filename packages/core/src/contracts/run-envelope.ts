import { z } from 'zod'
import { jsonValueSchema } from '../json.js'

export const testResultSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  actual: jsonValueSchema,

  /** Wall-clock time. Informational only, not the complexity metric (ADR 0011). */
  ms: z.number().int().nonnegative(),

  /** Operations counted by the prelude's instrumented structures (ADR 0011). */
  ops: z.number().int().nonnegative(),
})

export type TestResult = z.infer<typeof testResultSchema>

/**
 * The only shape the game understands, identical for every language (ADR 0006). The
 * harness prints this envelope between nonce-delimited markers, and it reaches the game as
 * text from an external process's stdout: untrusted data that goes through this schema
 * before it becomes a type (ADR 0017).
 */
export const runEnvelopeSchema = z.object({
  results: z.array(testResultSchema),

  /** Whatever the player's code printed, captured apart so it cannot corrupt the envelope. */
  playerStdout: z.string(),

  /** Failure that stopped the run from finishing; `null` when everything ran. */
  error: z.string().nullable(),
})

export type RunEnvelope = z.infer<typeof runEnvelopeSchema>
