import { describe, expect, it } from 'vitest'
import { formatTypeSpec, typeSpecSchema } from '../../src/value-objects/type-spec.js'

describe('formatTypeSpec', () => {
  it('renders the shortest-path challenge signature', () => {
    expect(
      formatTypeSpec({ kind: 'nullable', inner: { kind: 'list', element: { kind: 'string' } } }),
    ).toBe('nullable<list<string>>')
  })

  it('renders nested types', () => {
    expect(
      formatTypeSpec({
        kind: 'map',
        key: { kind: 'string' },
        value: { kind: 'list', element: { kind: 'int' } },
      }),
    ).toBe('map<string, list<int>>')
  })

  it('uses the struct name', () => {
    expect(
      formatTypeSpec({
        kind: 'struct',
        name: 'Edge',
        fields: [{ name: 'weight', type: { kind: 'float' } }],
      }),
    ).toBe('Edge')
  })
})

describe('typeSpecSchema', () => {
  it('accepts a valid recursive type', () => {
    expect(typeSpecSchema.safeParse({ kind: 'list', element: { kind: 'graph' } }).success).toBe(
      true,
    )
  })

  it('rejects an invalid type nested inside a valid one', () => {
    expect(typeSpecSchema.safeParse({ kind: 'list', element: { kind: 'tuple' } }).success).toBe(
      false,
    )
  })
})
