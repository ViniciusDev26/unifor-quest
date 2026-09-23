import { z } from 'zod'

/**
 * The neutral type system (ADR 0004). A challenge describes its signature here without
 * naming any language; each adapter maps these types onto its target language (ADR 0005).
 *
 * Widening this set forces a change in EVERY adapter: it is a contract change.
 *
 * This is the only place in `core` where the type is hand-written instead of coming from
 * `z.infer` (ADR 0019): TypeScript cannot infer a recursive type from a schema
 * initializer. The schema is annotated with this type, so the compiler still keeps both
 * in sync.
 */
export type TypeSpec =
  | { kind: 'int' }
  | { kind: 'float' }
  | { kind: 'bool' }
  | { kind: 'string' }
  | { kind: 'graph' }
  | { kind: 'list'; element: TypeSpec }
  | { kind: 'map'; key: { kind: 'string' }; value: TypeSpec }
  | { kind: 'nullable'; inner: TypeSpec }
  | { kind: 'struct'; name: string; fields: StructField[] }

export type StructField = { name: string; type: TypeSpec }

const structFieldSchema: z.ZodType<StructField> = z.object({
  name: z.string().min(1),
  get type() {
    return typeSpecSchema
  },
})

export const typeSpecSchema: z.ZodType<TypeSpec> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('int') }),
  z.object({ kind: z.literal('float') }),
  z.object({ kind: z.literal('bool') }),
  z.object({ kind: z.literal('string') }),
  z.object({ kind: z.literal('graph') }),
  z.object({
    kind: z.literal('list'),
    get element() {
      return typeSpecSchema
    },
  }),
  z.object({
    kind: z.literal('map'),
    // JSON objects only have string keys, so map keys are restricted to `string` for now.
    // Widening this is a contract change that touches every adapter (ADR 0004).
    key: z.object({ kind: z.literal('string') }),
    get value() {
      return typeSpecSchema
    },
  }),
  z.object({
    kind: z.literal('nullable'),
    get inner() {
      return typeSpecSchema
    },
  }),
  z.object({
    kind: z.literal('struct'),
    name: z.string().min(1),
    get fields() {
      return z.array(structFieldSchema)
    },
  }),
])

/** Renders a type in the notation used in challenge statements: `nullable<list<string>>`. */
export function formatTypeSpec(spec: TypeSpec): string {
  switch (spec.kind) {
    case 'int':
    case 'float':
    case 'bool':
    case 'string':
      return spec.kind
    case 'graph':
      return 'Graph'
    case 'list':
      return `list<${formatTypeSpec(spec.element)}>`
    case 'map':
      return `map<string, ${formatTypeSpec(spec.value)}>`
    case 'nullable':
      return `nullable<${formatTypeSpec(spec.inner)}>`
    case 'struct':
      return spec.name
    default: {
      const unreachable: never = spec
      return unreachable
    }
  }
}
