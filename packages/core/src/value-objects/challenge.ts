import { z } from 'zod'
import { languageIdSchema } from './language-id.js'
import { parameterSchema } from './parameter.js'
import { testCaseSchema } from './test-case.js'
import { typeSpecSchema } from './type-spec.js'

/**
 * A quest's challenge, described without naming any language. This is what each adapter
 * turns into the stub the player sees and the harness that runs the tests (ADR 0005).
 *
 * It has no identity of its own: a challenge belongs to the quest that declares it.
 */
export const challengeSchema = z.object({
  functionName: z.string().min(1),
  parameters: z.array(parameterSchema),
  returns: typeSpecSchema,
  cases: z.array(testCaseSchema).min(1),

  /** Escape hatch (ADR 0007): hand-written tests, only for the languages they cover. */
  customTests: z.boolean().default(false),

  /** Reference solution per language; it must pass the challenge's own tests (ADR 0014). */
  referenceSolutions: z.partialRecord(languageIdSchema, z.string().min(1)),
})

export type Challenge = z.infer<typeof challengeSchema>
