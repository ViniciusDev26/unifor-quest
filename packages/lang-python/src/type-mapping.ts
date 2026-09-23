import type { TypeSpec } from '@unifor-quest/core'

/**
 * Maps the neutral type system onto Python type hints (ADR 0005).
 *
 * Python does not check these at runtime, and that is the point: they are what the player
 * reads in the stub and what the language server uses to catch mistakes before running.
 * Total and explicit, with no `Any` escape hatch (ADR 0017).
 */
export function pythonTypeFor(spec: TypeSpec): string {
  switch (spec.kind) {
    case 'int':
      return 'int'
    case 'float':
      return 'float'
    case 'bool':
      return 'bool'
    case 'string':
      return 'str'
    case 'graph':
      return 'Graph'
    case 'list':
      return `list[${pythonTypeFor(spec.element)}]`
    case 'map':
      return `dict[str, ${pythonTypeFor(spec.value)}]`
    case 'nullable':
      return `${pythonTypeFor(spec.inner)} | None`
    case 'struct':
      return spec.name
    default: {
      const unreachable: never = spec
      return unreachable
    }
  }
}

/**
 * Declarations for the named struct types a challenge mentions, as dataclasses.
 *
 * A dataclass is what makes a struct feel native in Python and still serialise back —
 * the harness turns it into a dictionary on the way out.
 */
export function dataclassDeclarations(specs: readonly TypeSpec[]): string {
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
          .map((field) => `    ${field.name}: ${pythonTypeFor(field.type)}`)
          .join('\n')
        declared.set(spec.name, `@dataclass\nclass ${spec.name}:\n${fields}`)
        return
      }
      default:
        return
    }
  }

  for (const spec of specs) {
    visit(spec)
  }

  return [...declared.values()].join('\n\n\n')
}

/**
 * How one argument reaches the player's function.
 *
 * In every other language this is where decoding happens. In Python the parsed JSON is
 * already the right shape — a list is a `list`, an object is a `dict`, a string is a `str`
 * — so the only case that needs anything is a struct, which becomes a dataclass.
 */
export function decoderFor(spec: TypeSpec, value: string): string {
  if (spec.kind === 'graph') {
    return `graph_prelude.Graph(${value})`
  }

  if (spec.kind === 'struct') {
    const fields = spec.fields
      .map((field) => `${field.name}=${decoderFor(field.type, `${value}["${field.name}"]`)}`)
      .join(', ')
    return `${spec.name}(${fields})`
  }

  if (spec.kind === 'nullable' && spec.inner.kind === 'struct') {
    return `(None if ${value} is None else ${decoderFor(spec.inner, value)})`
  }

  return value
}
