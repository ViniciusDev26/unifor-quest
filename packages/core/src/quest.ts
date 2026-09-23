import { z } from 'zod'
import { challengeSchema } from './challenge.js'

export const dialogueLineSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
})

export type DialogueLine = z.infer<typeof dialogueLineSchema>

/**
 * A quest is data, not logic scattered across scenes (ADR 0014).
 *
 * `onSuccess` is still missing here: it receives the real return value of the player's
 * code and changes the world (ADR 0013). It depends on a closed vocabulary of effects that
 * has not been decided yet — see docs/open-questions.md. Widening that vocabulary is an
 * engine change, so it does not get improvised into this schema.
 */
export const questSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  npc: z.string().min(1),

  /** Flags that must be set for the quest to become available. */
  requires: z.array(z.string().min(1)).default([]),

  dialogue: z.object({
    offer: z.array(dialogueLineSchema).min(1),
    success: z.array(dialogueLineSchema).min(1),
  }),

  challenge: challengeSchema,
})

export type Quest = z.infer<typeof questSchema>
