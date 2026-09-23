import type { TypeSpec } from '@unifor-quest/core'

/**
 * Maps the neutral type system onto Java (ADR 0005). Total and explicit: no `Object` as an
 * escape hatch — a type the adapter cannot express is a contract problem, not something to
 * paper over (ADR 0017).
 */
export function javaTypeFor(spec: TypeSpec): string {
  switch (spec.kind) {
    case 'int':
      return 'int'
    case 'float':
      return 'double'
    case 'bool':
      return 'boolean'
    case 'string':
      return 'String'
    case 'graph':
      return 'Graph'
    case 'list':
      return `List<${boxedTypeFor(spec.element)}>`
    case 'map':
      return `Map<String, ${boxedTypeFor(spec.value)}>`
    case 'nullable':
      return boxedTypeFor(spec.inner)
    case 'struct':
      return spec.name
    default: {
      const unreachable: never = spec
      return unreachable
    }
  }
}

/**
 * Java generics hold objects, not primitives, and `null` needs somewhere to live. So a
 * `list<int>` is a `List<Integer>` and a `nullable<int>` is an `Integer` — the boxed form
 * is what makes "zero" and "absent" different values.
 */
export function boxedTypeFor(spec: TypeSpec): string {
  switch (spec.kind) {
    case 'int':
      return 'Integer'
    case 'float':
      return 'Double'
    case 'bool':
      return 'Boolean'
    default:
      return javaTypeFor(spec)
  }
}

/** The expression that turns one parsed JSON value into the declared Java type. */
export function decoderFor(spec: TypeSpec, value: string, depth = 0): string {
  switch (spec.kind) {
    case 'int':
      return `Json.asInt(${value})`
    case 'float':
      return `Json.asDouble(${value})`
    case 'bool':
      return `Json.asBoolean(${value})`
    case 'string':
      return `Json.asString(${value})`
    case 'graph':
      return `Graph.from(${value})`
    case 'list': {
      const item = `v${depth}`
      return `Json.asList(${value}, ${item} -> ${boxedDecoderFor(spec.element, item, depth + 1)})`
    }
    case 'map': {
      const item = `v${depth}`
      return `Json.asMap(${value}, ${item} -> ${boxedDecoderFor(spec.value, item, depth + 1)})`
    }
    case 'nullable':
      return boxedDecoderFor(spec.inner, value, depth)
    case 'struct': {
      const item = `v${depth}`
      const fields = spec.fields
        .map(
          (field) =>
            `${decoderFor(field.type, `Json.asObject(${item}).get("${field.name}")`, depth + 1)}`,
        )
        .join(', ')
      return `Json.asNullable(${value}, ${item} -> new ${spec.name}(${fields}))`
    }
    default: {
      const unreachable: never = spec
      return unreachable
    }
  }
}

/** Same decoder, but producing the boxed form, which tolerates `null`. */
function boxedDecoderFor(spec: TypeSpec, value: string, depth: number): string {
  switch (spec.kind) {
    case 'int':
      return `Json.asBoxedInt(${value})`
    case 'float':
      return `Json.asBoxedDouble(${value})`
    case 'bool':
      return `Json.asBoxedBoolean(${value})`
    default:
      return decoderFor(spec, value, depth)
  }
}

/** Declarations for the named struct types a challenge mentions, as records. */
export function recordDeclarations(specs: readonly TypeSpec[]): string {
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
        const components = spec.fields
          .map((field) => `${javaTypeFor(field.type)} ${field.name}`)
          .join(', ')
        declared.set(spec.name, `record ${spec.name}(${components}) {}`)
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
