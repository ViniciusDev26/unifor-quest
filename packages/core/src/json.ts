import { z } from 'zod'

/**
 * Only JSON crosses the boundary between the game and the player's code (ADR 0004), so
 * every value that travels — test inputs, expected values, what the harness returns — is
 * a JSON value and nothing else. `undefined` is rejected on purpose: `null` is a value,
 * absence is not.
 */
export const jsonValueSchema = z.json()

export type JsonValue = z.infer<typeof jsonValueSchema>
