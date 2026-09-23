import { z } from 'zod'

/**
 * Sistema de tipos neutro (ADR 0004). Um desafio descreve a sua assinatura aqui, sem citar
 * linguagem nenhuma; cada adapter mapeia estes tipos para os da linguagem alvo (ADR 0005).
 *
 * Ampliar este conjunto obriga a mexer em TODOS os adapters: e mudanca de contrato.
 *
 * Este e o unico ponto do `core` onde o tipo e escrito a mao em vez de sair de `z.infer`
 * (ADR 0019): TypeScript nao infere um tipo recursivo a partir do inicializador do schema.
 * O schema e anotado com este tipo, entao os dois continuam amarrados pelo compilador.
 */
export type TypeSpec =
  | { kind: 'int' }
  | { kind: 'float' }
  | { kind: 'bool' }
  | { kind: 'string' }
  | { kind: 'graph' }
  | { kind: 'list'; element: TypeSpec }
  | { kind: 'map'; key: TypeSpec; value: TypeSpec }
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
    get key() {
      return typeSpecSchema
    },
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

/** Renderiza um tipo na notacao usada nos enunciados: `nullable<list<string>>`. */
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
      return `map<${formatTypeSpec(spec.key)}, ${formatTypeSpec(spec.value)}>`
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
