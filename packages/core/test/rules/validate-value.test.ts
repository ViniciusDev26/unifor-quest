import { describe, expect, it } from 'vitest'
import { validateValue } from '../../src/rules/validate-value.js'
import type { TypeSpec } from '../../src/value-objects/type-spec.js'

describe('validateValue', () => {
  it('accepts a whole number as int and rejects a fractional one', () => {
    expect(validateValue({ kind: 'int' }, 3)).toEqual([])
    expect(validateValue({ kind: 'int' }, 3.5)).toEqual(['$: expected int, got number'])
  })

  it('accepts a whole number as float', () => {
    expect(validateValue({ kind: 'float' }, 3)).toEqual([])
    expect(validateValue({ kind: 'float' }, 3.5)).toEqual([])
  })

  it('reports the type it actually got', () => {
    expect(validateValue({ kind: 'string' }, 7)).toEqual(['$: expected string, got number'])
    expect(validateValue({ kind: 'bool' }, null)).toEqual(['$: expected bool, got null'])
    expect(validateValue({ kind: 'string' }, [])).toEqual(['$: expected string, got list'])
  })

  it('accepts null only where the type is nullable', () => {
    const nullableList: TypeSpec = {
      kind: 'nullable',
      inner: { kind: 'list', element: { kind: 'string' } },
    }
    expect(validateValue(nullableList, null)).toEqual([])
    expect(validateValue(nullableList, ['BIB'])).toEqual([])
    expect(validateValue({ kind: 'list', element: { kind: 'string' } }, null)).toEqual([
      '$: expected list, got null',
    ])
  })

  it('points at the offending element of a list', () => {
    expect(validateValue({ kind: 'list', element: { kind: 'string' } }, ['BIB', 7])).toEqual([
      '$[1]: expected string, got number',
    ])
  })

  it('validates map values and points at the key', () => {
    const counts: TypeSpec = { kind: 'map', key: { kind: 'string' }, value: { kind: 'int' } }
    expect(validateValue(counts, { BIB: 3, CE: 4 })).toEqual([])
    expect(validateValue(counts, { BIB: 'tres' })).toEqual(['$.BIB: expected int, got string'])
  })

  it('reports missing and unknown struct fields', () => {
    const edge: TypeSpec = {
      kind: 'struct',
      name: 'Edge',
      fields: [
        { name: 'to', type: { kind: 'string' } },
        { name: 'weight', type: { kind: 'float' } },
      ],
    }
    expect(validateValue(edge, { to: 'CE', weight: 684 })).toEqual([])
    expect(validateValue(edge, { to: 'CE', cost: 684 })).toEqual([
      '$.weight: missing field',
      '$.cost: unknown field for Edge',
    ])
  })

  it('validates a graph value', () => {
    const graph = { nodes: [{ id: 'BIB', label: 'Biblioteca' }], edges: [] }
    expect(validateValue({ kind: 'graph' }, graph)).toEqual([])
    expect(
      validateValue({ kind: 'graph' }, { nodes: [], edges: [{ from: 'A', to: 'B', weight: 1 }] }),
    ).toHaveLength(2)
  })
})
