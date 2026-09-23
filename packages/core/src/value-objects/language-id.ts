import { z } from 'zod'

/**
 * Supported languages. TypeScript and Java defined the abstraction, Go tested it by being
 * the first compiled one, and Python came after as the cheapest measure of what a language
 * costs (ADR 0015, ADR 0016, ADR 0040, ADR 0052).
 */
export const languageIdSchema = z.enum(['typescript', 'java', 'go', 'python'])

export type LanguageId = z.infer<typeof languageIdSchema>
