import { z } from 'zod'
import type { Progress } from './progress.js'

/**
 * What must already be true for something to happen: a quest to become available, a
 * cutscene to play (ADR 0034, ADR 0066). One shape for both, so "what the world needs"
 * means the same thing everywhere.
 */
export const requirementsSchema = z
  .object({
    /** Ids of quests that must be completed. */
    quests: z.array(z.string().min(1)).default([]),
    /** World flags that must be set — state that is not a quest by itself. */
    flags: z.array(z.string().min(1)).default([]),
  })
  .default({ quests: [], flags: [] })

export type Requirements = z.infer<typeof requirementsSchema>

export function requirementsMet(requires: Requirements, progress: Progress): boolean {
  const completed = new Set(progress.completedQuests)
  const flags = new Set(progress.flags)

  return (
    requires.quests.every((id) => completed.has(id)) &&
    requires.flags.every((flag) => flags.has(flag))
  )
}
