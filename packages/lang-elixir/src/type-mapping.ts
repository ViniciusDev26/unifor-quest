import type { TypeSpec } from '@unifor-quest/core'

/**
 * Maps the neutral type system onto Elixir typespecs (ADR 0005).
 *
 * A `@spec` is unchecked at runtime, the same posture as Python's type hints: it is what the
 * player reads in the stub and what the language server's static analysis checks, never a
 * runtime guarantee (ADR 0017 still holds — this mapping is total and explicit, with no
 * escape hatch to `term()`).
 */
export function elixirTypeFor(spec: TypeSpec): string {
  switch (spec.kind) {
    case 'int':
      return 'integer()'
    case 'float':
      return 'float()'
    case 'bool':
      return 'boolean()'
    case 'string':
      return 'String.t()'
    case 'graph':
      return 'Graph.t()'
    case 'list':
      return `[${elixirTypeFor(spec.element)}]`
    case 'map':
      return `%{String.t() => ${elixirTypeFor(spec.value)}}`
    case 'nullable':
      return `${elixirTypeFor(spec.inner)} | nil`
    case 'struct':
      return `${spec.name}.t()`
    default: {
      const unreachable: never = spec
      return unreachable
    }
  }
}

/**
 * Declarations for the named struct types a challenge mentions, each its own module with a
 * `defstruct` and a `t()` type.
 *
 * A struct literal (`%Name{}`) only resolves against a module compiled in the *same* file
 * (the BEAM has no forward reference across separately-required files in script mode), so
 * these live in the same file as the code that uses them: the stub for the player's side,
 * and — separately — wherever the harness decodes one.
 */
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
        const keys = spec.fields.map((field) => `:${field.name}`).join(', ')
        const typeFields = spec.fields
          .map((field) => `${field.name}: ${elixirTypeFor(field.type)}`)
          .join(', ')
        declared.set(
          spec.name,
          `defmodule ${spec.name} do\n  @moduledoc false\n  @enforce_keys [${keys}]\n  defstruct [${keys}]\n  @type t :: %__MODULE__{${typeFields}}\nend`,
        )
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

/**
 * How one argument reaches the player's function.
 *
 * Parsed JSON is already the right native shape for every scalar, list and map — Elixir
 * gains nothing from re-typing them. A struct needs `struct/2`, not the `%Name{}` literal:
 * the literal requires the module to be known at compile time, which does not hold for a
 * module pulled in by a runtime `Code.require_file` one line above (ADR 0005's harness is
 * generated at run time, never at compile time).
 */
export function decoderFor(spec: TypeSpec, value: string): string {
  if (spec.kind === 'graph') {
    return `Graph.new(${value})`
  }

  if (spec.kind === 'struct') {
    const fields = spec.fields
      .map((field) => `${field.name}: ${decoderFor(field.type, `${value}["${field.name}"]`)}`)
      .join(', ')
    return `struct(${spec.name}, [${fields}])`
  }

  if (spec.kind === 'nullable' && spec.inner.kind === 'struct') {
    return `(if ${value} == nil, do: nil, else: ${decoderFor(spec.inner, value)})`
  }

  return value
}
