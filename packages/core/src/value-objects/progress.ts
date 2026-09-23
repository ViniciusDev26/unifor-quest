import { z } from 'zod'

/**
 * Everything the game needs to know about how far the player got. It is a value: the rules
 * never mutate it, they return a new one.
 *
 * Arrays instead of sets because this is what gets written to disk on every completion
 * (ADR 0020) and JSON has no set.
 */
export const progressSchema = z.object({
  /** Ids of quests already completed. Order is irrelevant. */
  completedQuests: z.array(z.string().min(1)).default([]),

  /** World flags that are set — state that is not a quest by itself (ADR 0034). */
  flags: z.array(z.string().min(1)).default([]),
})

export type Progress = z.infer<typeof progressSchema>

export const emptyProgress: Progress = { completedQuests: [], flags: [] }
