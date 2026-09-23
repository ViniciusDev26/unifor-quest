import { z } from 'zod'
import { jsonValueSchema } from './json.js'
import { languageIdSchema } from './language.js'
import { typeSpecSchema } from './type-spec.js'

export const parameterSchema = z.object({
  name: z.string().min(1),
  type: typeSpecSchema,
})

export type Parameter = z.infer<typeof parameterSchema>

/**
 * A test case is plain data (ADR 0004): `input` holds one JSON value per parameter, in the
 * order they are declared, and `expected` is the expected return value.
 */
export const testCaseSchema = z.object({
  name: z.string().min(1),
  input: z.array(jsonValueSchema),
  expected: jsonValueSchema,
})

export type TestCase = z.infer<typeof testCaseSchema>

/**
 * A quest's challenge, described without naming any language. This is what each adapter
 * turns into the stub the player sees and the harness that runs the tests (ADR 0005).
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
