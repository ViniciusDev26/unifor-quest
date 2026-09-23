import { z } from 'zod'

/**
 * Supported languages. TypeScript and Java define the abstraction, Go tests it;
 * all three are in scope (ADR 0015, ADR 0016).
 */
export const languageIdSchema = z.enum(['typescript', 'java', 'go'])

export type LanguageId = z.infer<typeof languageIdSchema>
