import { z } from 'zod'
import { typeSpecSchema } from './type-spec.js'

/** One declared parameter of a challenge's function: a name and a neutral type. */
export const parameterSchema = z.object({
  name: z.string().min(1),
  type: typeSpecSchema,
})

export type Parameter = z.infer<typeof parameterSchema>
