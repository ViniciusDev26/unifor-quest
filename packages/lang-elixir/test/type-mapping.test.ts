import { describe, expect, it } from 'vitest'
import { decoderFor, elixirTypeFor, structDeclarations } from '../src/type-mapping.js'

describe('elixirTypeFor', () => {
  it('maps the scalars', () => {
    expect(elixirTypeFor({ kind: 'int' })).toBe('integer()')
    expect(elixirTypeFor({ kind: 'float' })).toBe('float()')
    expect(elixirTypeFor({ kind: 'bool' })).toBe('boolean()')
    expect(elixirTypeFor({ kind: 'string' })).toBe('String.t()')
  })

  it('writes list and map as typespecs', () => {
    expect(elixirTypeFor({ kind: 'list', element: { kind: 'int' } })).toBe('[integer()]')
    expect(elixirTypeFor({ kind: 'map', key: { kind: 'string' }, value: { kind: 'bool' } })).toBe(
      '%{String.t() => boolean()}',
    )
  })

  it('writes a nullable as a union with nil', () => {
    expect(
      elixirTypeFor({ kind: 'nullable', inner: { kind: 'list', element: { kind: 'string' } } }),
    ).toBe('[String.t()] | nil')
  })

  it('names a struct type by its own t()', () => {
    expect(elixirTypeFor({ kind: 'struct', name: 'Edge', fields: [] })).toBe('Edge.t()')
  })
})

describe('decoderFor', () => {
  it('passes a value through, because parsed JSON already has the right shape', () => {
    expect(decoderFor({ kind: 'string' }, 'arguments[0]')).toBe('arguments[0]')
    expect(decoderFor({ kind: 'list', element: { kind: 'int' } }, 'x')).toBe('x')
  })

  it('decodes a graph through the prelude', () => {
    expect(decoderFor({ kind: 'graph' }, 'x')).toBe('Graph.new(x)')
  })

  it('builds a struct with struct/2, not a literal', () => {
    expect(
      decoderFor(
        {
          kind: 'struct',
          name: 'Edge',
          fields: [
            { name: 'to', type: { kind: 'string' } },
            { name: 'weight', type: { kind: 'float' } },
          ],
        },
        'x',
      ),
    ).toBe('struct(Edge, [to: x["to"], weight: x["weight"]])')
  })

  it('guards a nullable struct against nil', () => {
    expect(
      decoderFor(
        {
          kind: 'nullable',
          inner: {
            kind: 'struct',
            name: 'Edge',
            fields: [{ name: 'to', type: { kind: 'string' } }],
          },
        },
        'x',
      ),
    ).toBe('(if x == nil, do: nil, else: struct(Edge, [to: x["to"]]))')
  })
})

describe('structDeclarations', () => {
  it('declares a struct as its own module', () => {
    expect(
      structDeclarations([
        {
          kind: 'struct',
          name: 'Edge',
          fields: [
            { name: 'to', type: { kind: 'string' } },
            { name: 'weight', type: { kind: 'float' } },
          ],
        },
      ]),
    ).toBe(
      'defmodule Edge do\n  @moduledoc false\n  @enforce_keys [:to, :weight]\n  defstruct [:to, :weight]\n  @type t :: %__MODULE__{to: String.t(), weight: float()}\nend',
    )
  })

  it('says nothing when there is no struct', () => {
    expect(structDeclarations([{ kind: 'string' }])).toBe('')
  })
})
