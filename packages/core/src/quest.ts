import { z } from 'zod'
import { challengeSchema } from './challenge.js'

export const dialogueLineSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
})

export type DialogueLine = z.infer<typeof dialogueLineSchema>

/**
 * Uma quest e dado, nao logica espalhada pelas cenas (ADR 0014).
 *
 * Falta aqui o `onSuccess`, que recebe o retorno real do codigo do jogador e altera o
 * mundo (ADR 0013). Ele depende de um vocabulario fechado de efeitos que ainda nao foi
 * decidido — ver docs/open-questions.md. Ampliar esse vocabulario e mudanca de engine,
 * entao ele nao entra aqui por improviso.
 */
export const questSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  npc: z.string().min(1),

  /** Flags que precisam estar ativas para a quest aparecer. */
  requires: z.array(z.string().min(1)).default([]),

  dialogue: z.object({
    offer: z.array(dialogueLineSchema).min(1),
    success: z.array(dialogueLineSchema).min(1),
  }),

  challenge: challengeSchema,
})

export type Quest = z.infer<typeof questSchema>
