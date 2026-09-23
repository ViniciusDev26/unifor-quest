import { z } from 'zod'

/**
 * Supported languages. TypeScript and Java defined the abstraction, Go tested it by being
 * the first compiled one, Python came after as the cheapest measure of what a language
 * costs, and Elixir tested the abstraction against a functional, dynamically-typed
 * language with no mutable global state (ADR 0015, ADR 0016, ADR 0040, ADR 0052, ADR 0056).
 */
export const languageIdSchema = z.enum(['typescript', 'java', 'go', 'python', 'elixir'])

export type LanguageId = z.infer<typeof languageIdSchema>
