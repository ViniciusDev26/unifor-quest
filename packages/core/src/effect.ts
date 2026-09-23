import { z } from 'zod'

/**
 * What a quest declares should happen once the player's code passes (ADR 0013). The engine
 * emits these; the Phaser scenes interpret them (ADR 0027). The engine decides *what
 * happens*, the scenes decide *how it looks*.
 *
 * Effects are applied **only on the first completion**: replaying a quest in another
 * language does not change the world again (ADR 0030).
 *
 * This vocabulary is closed on purpose, and widening it is an engine change, not content.
 * A door being unlocked is expressible as a flag the world reads, so no dedicated variant
 * exists until a real case proves flags are not enough.
 *
 * Marking the quest itself as completed is NOT an effect: the engine already knows that,
 * and making every quest declare it would be ceremony that one day gets forgotten.
 */
export const effectSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('setFlag'),
    flag: z.string().min(1),
  }),
])

export type Effect = z.infer<typeof effectSchema>
