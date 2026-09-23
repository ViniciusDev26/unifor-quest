import type { TypeSpec } from '@unifor-quest/core'

/**
 * Maps the neutral type system onto Go (ADR 0005). Total and explicit: no `any`, no
 * `interface{}` as an escape hatch — a type the adapter cannot express is a contract
 * problem, not something to paper over (ADR 0017, ADR 0024).
 */
export function goTypeFor(spec: TypeSpec): string {
  switch (spec.kind) {
    case 'int':
      return 'int'
    case 'float':
      return 'float64'
    case 'bool':
      return 'bool'
    case 'string':
      return 'string'
    case 'graph':
      return 'Graph'
    case 'list':
      return `[]${goTypeFor(spec.element)}`
    case 'map':
      return `map[string]${goTypeFor(spec.value)}`
    case 'nullable':
      return nullableTypeFor(spec.inner)
    case 'struct':
      return spec.name
    default: {
      const unreachable: never = spec
      return unreachable
    }
  }
}

/**
 * Go has no `null`, it has zero values — so `nullable<T>` maps to whatever in Go can
 * legitimately be nil.
 *
 * A slice and a map already can: `encoding/json` writes a nil one as `null` and an empty
 * one as `[]`, which is exactly the distinction the game needs. Everything else becomes a
 * pointer, because `0` and "absent" have to stay different.
 */
function nullableTypeFor(inner: TypeSpec): string {
  if (inner.kind === 'list' || inner.kind === 'map') {
    return goTypeFor(inner)
  }
  return `*${goTypeFor(inner)}`
}

/** Declarations for the named struct types a challenge mentions, deepest first. */
export function structDeclarations(specs: readonly TypeSpec[]): string {
  const declared = new Map<string, string>()

  const visit = (spec: TypeSpec): void => {
    switch (spec.kind) {
      case 'list':
        visit(spec.element)
        return
      case 'map':
        visit(spec.value)
        return
      case 'nullable':
        visit(spec.inner)
        return
      case 'struct': {
        for (const field of spec.fields) {
          visit(field.type)
        }
        const fields = spec.fields
          .map(
            (field) =>
              `\t${exported(field.name)} ${goTypeFor(field.type)} \`json:"${field.name}"\``,
          )
          .join('\n')
        declared.set(spec.name, `type ${spec.name} struct {\n${fields}\n}`)
        return
      }
      default:
        return
    }
  }

  for (const spec of specs) {
    visit(spec)
  }

  return [...declared.values()].join('\n\n')
}

/** `encoding/json` only sees exported fields, so a struct field has to start uppercase. */
function exported(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}
