import { z } from 'zod'

/**
 * Linguagens suportadas. TypeScript e Java definem a abstracao, Go a testa;
 * as tres estao no MVP (ADR 0015, ADR 0016).
 */
export const languageIdSchema = z.enum(['typescript', 'java', 'go'])

export type LanguageId = z.infer<typeof languageIdSchema>
