import { describe, expect, it } from 'vitest'
import { goTypeFor, structDeclarations } from '../src/type-mapping.js'

describe('goTypeFor', () => {
  it('maps the scalars', () => {
    expect(goTypeFor({ kind: 'int' })).toBe('int')
    expect(goTypeFor({ kind: 'float' })).toBe('float64')
    expect(goTypeFor({ kind: 'bool' })).toBe('bool')
    expect(goTypeFor({ kind: 'string' })).toBe('string')
  })

  it('maps collections', () => {
    expect(goTypeFor({ kind: 'list', element: { kind: 'string' } })).toBe('[]string')
    expect(goTypeFor({ kind: 'map', key: { kind: 'string' }, value: { kind: 'int' } })).toBe(
      'map[string]int',
    )
  })

  it('leaves a nullable slice as a slice, because a nil slice already encodes as null', () => {
    expect(
      goTypeFor({ kind: 'nullable', inner: { kind: 'list', element: { kind: 'string' } } }),
    ).toBe('[]string')
    expect(
      goTypeFor({
        kind: 'nullable',
        inner: { kind: 'map', key: { kind: 'string' }, value: { kind: 'int' } },
      }),
    ).toBe('map[string]int')
  })

  it('makes a nullable scalar a pointer, so zero and absent stay different', () => {
    expect(goTypeFor({ kind: 'nullable', inner: { kind: 'int' } })).toBe('*int')
    expect(goTypeFor({ kind: 'nullable', inner: { kind: 'string' } })).toBe('*string')
  })

  it('nests', () => {
    expect(goTypeFor({ kind: 'list', element: { kind: 'nullable', inner: { kind: 'int' } } })).toBe(
      '[]*int',
    )
  })
})

describe('structDeclarations', () => {
  it('exports every field and tags it with the name the JSON uses', () => {
    const declared = structDeclarations([
      {
        kind: 'struct',
        name: 'Edge',
        fields: [
          { name: 'to', type: { kind: 'string' } },
          { name: 'weight', type: { kind: 'float' } },
        ],
      },
    ])

    expect(declared).toBe(
      'type Edge struct {\n\tTo string `json:"to"`\n\tWeight float64 `json:"weight"`\n}',
    )
  })

  it('declares nested structs too, and only once', () => {
    const point = {
      kind: 'struct' as const,
      name: 'Point',
      fields: [{ name: 'x', type: { kind: 'int' as const } }],
    }
    const declared = structDeclarations([
      { kind: 'list', element: point },
      { kind: 'nullable', inner: point },
    ])

    expect(declared.match(/type Point struct/g)).toHaveLength(1)
  })

  it('says nothing when there is no struct', () => {
    expect(structDeclarations([{ kind: 'string' }])).toBe('')
  })
})
