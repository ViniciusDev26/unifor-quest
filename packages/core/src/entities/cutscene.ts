import { z } from 'zod'
import { dialogueLineSchema } from '../value-objects/dialogue-line.js'
import { requirementsSchema } from '../value-objects/requirements.js'

/** A position in tiles of the scene's own map, not pixels nor map markers (ADR 0066). */
export const tilePointSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export type TilePoint = z.infer<typeof tilePointSchema>

/**
 * One beat of a cutscene. Steps run in sequence: each one ends before the next begins.
 *
 * Closed vocabulary on purpose, like `Effect`: widening it is an engine change, and the
 * union grows when a real cutscene needs it (ADR 0066). `cue` is the escape to the scene —
 * the data says *when* the screens go dark, the scene decides what that looks like.
 */
export const cutsceneStepSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('say'), lines: z.array(dialogueLineSchema).min(1) }),
  z.object({ kind: z.literal('wait'), ms: z.number().int().positive() }),
  z.object({ kind: z.literal('spawn'), actor: z.string().min(1), at: tilePointSchema }),
  z.object({ kind: z.literal('despawn'), actor: z.string().min(1) }),
  z.object({ kind: z.literal('move'), actor: z.string().min(1), to: tilePointSchema }),
  z.object({
    kind: z.literal('fade'),
    direction: z.enum(['in', 'out']),
    ms: z.number().int().positive(),
  }),
  z.object({ kind: z.literal('cue'), name: z.string().min(1) }),
])

export type CutsceneStep = z.infer<typeof cutsceneStepSchema>

/**
 * A scene the player watches instead of plays (ADR 0066). It is data, like a quest
 * (ADR 0014): the content lives next to the place's quest, and the scene only knows how to
 * perform the steps.
 *
 * There is no trigger: a cutscene plays in its `scene` as soon as `requires` holds and it
 * has not been seen yet — on entering the scene or right after progress changes there.
 */
export const cutsceneSchema = z.object({
  id: z.string().min(1),
  /** Key of the Phaser scene where it plays. */
  scene: z.string().min(1),
  requires: requirementsSchema,
  steps: z.array(cutsceneStepSchema).min(1),
})

export type Cutscene = z.infer<typeof cutsceneSchema>
