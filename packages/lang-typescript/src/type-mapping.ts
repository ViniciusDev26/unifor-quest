import { formatTypeSpec, type TypeSpec } from '@unifor-quest/core'

/**
 * Maps the neutral type system onto TypeScript (ADR 0005). The mapping is total and
 * explicit: there is no `any` fallback, because a type the adapter cannot express is a
 * contract problem, not something to paper over (ADR 0017, ADR 0024).
 */
export function tsTypeFor(spec: TypeSpec): string {
  switch (spec.kind) {
    case 'int':
    case 'float':
      return 'number'
    case 'bool':
      return 'boolean'
    case 'string':
      return 'string'
    case 'graph':
      return 'Graph'
    case 'list':
      return `${wrap(spec.element)}[]`
    case 'map':
      return `Record<string, ${tsTypeFor(spec.value)}>`
    case 'nullable':
      return `${tsTypeFor(spec.inner)} | null`
    case 'struct':
      return `{ ${spec.fields.map((field) => `${field.name}: ${tsTypeFor(field.type)}`).join('; ')} }`
    default: {
      const unreachable: never = spec
      return unreachable
    }
  }
}

/** `(A | null)[]` instead of `A | null[]`, which would mean something else entirely. */
function wrap(spec: TypeSpec): string {
  const rendered = tsTypeFor(spec)
  return rendered.includes('|') ? `(${rendered})` : rendered
}

/** The signature as the player reads it in the challenge statement. */
export function signatureOf(
  functionName: string,
  parameters: readonly { name: string; type: TypeSpec }[],
  returns: TypeSpec,
): string {
  const args = parameters.map((p) => `${p.name}: ${formatTypeSpec(p.type)}`).join(', ')
  return `${functionName}(${args}) -> ${formatTypeSpec(returns)}`
}
