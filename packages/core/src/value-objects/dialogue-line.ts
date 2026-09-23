import { z } from 'zod'

/** One line of dialogue. The text is the player's language, not the code's (ADR 0031). */
export const dialogueLineSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
})

export type DialogueLine = z.infer<typeof dialogueLineSchema>
