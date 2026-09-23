import { graphSchema } from './graph.js'
import type { JsonValue } from './json.js'
import type { TypeSpec } from './type-spec.js'

/**
 * Checks that a JSON value matches a declared `TypeSpec`.
 *
 * This is what catches a broken quest while it is being written, instead of in the
 * player's face: a case whose arguments are in the wrong order, or an `expected` in a
 * shape the challenge never declared (ADR 0004, ADR 0017).
 *
 * Returns the problems found, each with a path. An empty array means the value matches.
 *
 * - `int` takes whole numbers only; `3.5` is rejected.
 * - `float` takes whole numbers too: an integer is a valid real.
 * - `map` keys are strings, because JSON objects have no other kind of key.
 * - `struct` rejects unknown fields, for the same reason equality does.
 */
export function validateValue(spec: TypeSpec, value: JsonValue, path = '$'): string[] {
  switch (spec.kind) {
    case 'int':
      return typeof value === 'number' && Number.isInteger(value)
        ? []
        : [`${path}: expected int, got ${describe(value)}`]

    case 'float':
      return typeof value === 'number' && Number.isFinite(value)
        ? []
        : [`${path}: expected float, got ${describe(value)}`]

    case 'bool':
      return typeof value === 'boolean' ? [] : [`${path}: expected bool, got ${describe(value)}`]

    case 'string':
      return typeof value === 'string' ? [] : [`${path}: expected string, got ${describe(value)}`]

    case 'graph': {
      const parsed = graphSchema.safeParse(value)
      return parsed.success
        ? []
        : parsed.error.issues.map((issue) => `${path}: invalid graph: ${issue.message}`)
    }

    case 'nullable':
      return value === null ? [] : validateValue(spec.inner, value, path)

    case 'list': {
      if (!Array.isArray(value)) {
        return [`${path}: expected list, got ${describe(value)}`]
      }
      return value.flatMap((item, index) => validateValue(spec.element, item, `${path}[${index}]`))
    }

    case 'map': {
      const entries = asRecord(value)
      if (entries === null) {
        return [`${path}: expected map, got ${describe(value)}`]
      }
      return Object.entries(entries).flatMap(([key, item]) =>
        validateValue(spec.value, item, `${path}.${key}`),
      )
    }

    case 'struct': {
      const entries = asRecord(value)
      if (entries === null) {
        return [`${path}: expected ${spec.name}, got ${describe(value)}`]
      }

      const issues: string[] = []
      const declared = new Set<string>()

      for (const field of spec.fields) {
        declared.add(field.name)
        const item = entries[field.name]
        if (item === undefined) {
          issues.push(`${path}.${field.name}: missing field`)
        } else {
          issues.push(...validateValue(field.type, item, `${path}.${field.name}`))
        }
      }

      for (const key of Object.keys(entries)) {
        if (!declared.has(key)) {
          issues.push(`${path}.${key}: unknown field for ${spec.name}`)
        }
      }

      return issues
    }

    default: {
      const unreachable: never = spec
      return unreachable
    }
  }
}

function asRecord(value: JsonValue): Record<string, JsonValue> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  return value
}

function describe(value: JsonValue): string {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'list'
  }
  return typeof value
}
