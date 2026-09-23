import { z } from 'zod'
import { challengeSchema } from './challenge.js'
import { effectSchema } from './effect.js'

export const dialogueLineSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
})

export type DialogueLine = z.infer<typeof dialogueLineSchema>

/**
 * A quest is data, not logic scattered across scenes (ADR 0014).
 *
 * Completing the quest is not declared here: the engine knows which quests are done.
 * `onSuccess` declares only what is specific to this quest (ADR 0027), and it is applied
 * once, on the first completion — replaying in another language does not run it again
 * (ADR 0030).
 */
export const questSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  npc: z.string().min(1),

  /** What must already be true for the quest to become available. */
  requires: z
    .object({
      /** Ids of quests that must be completed. */
      quests: z.array(z.string().min(1)).default([]),
      /** World flags that must be set — state that is not a quest by itself. */
      flags: z.array(z.string().min(1)).default([]),
    })
    .default({ quests: [], flags: [] }),

  dialogue: z.object({
    offer: z.array(dialogueLineSchema).min(1),
    success: z.array(dialogueLineSchema).min(1),
  }),

  challenge: challengeSchema,

  /** Applied once, on the first completion. */
  onSuccess: z.array(effectSchema).default([]),
})

export type Quest = z.infer<typeof questSchema>
