import { z } from 'zod'

/**
 * A Tiled object's `properties`, in the array a `.tmj` carries (ADR 0058). The map is a file
 * the game reads, so its shape is checked here rather than assumed (ADR 0017). It lives apart
 * from the scene so a test can reach it: importing the scene loads Phaser, which needs a window.
 */
export const tiledPropertiesSchema = z.array(
  z.object({ name: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) }),
)

export type TiledPropertyValue = z.infer<typeof tiledPropertiesSchema>[number]['value']
