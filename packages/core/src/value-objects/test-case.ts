import { z } from 'zod'
import { jsonValueSchema } from '../json.js'

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
