import { describe, expect, it } from 'vitest'
import { dataclassDeclarations, decoderFor, pythonTypeFor } from '../src/type-mapping.js'

describe('pythonTypeFor', () => {
  it('maps the scalars', () => {
    expect(pythonTypeFor({ kind: 'int' })).toBe('int')
    expect(pythonTypeFor({ kind: 'float' })).toBe('float')
    expect(pythonTypeFor({ kind: 'bool' })).toBe('bool')
    expect(pythonTypeFor({ kind: 'string' })).toBe('str')
  })

  it('uses the modern generic syntax, with no typing imports', () => {
    expect(pythonTypeFor({ kind: 'list', element: { kind: 'int' } })).toBe('list[int]')
    expect(pythonTypeFor({ kind: 'map', key: { kind: 'string' }, value: { kind: 'bool' } })).toBe(
      'dict[str, bool]',
    )
  })

  it('writes a nullable as a union with None', () => {
    expect(
      pythonTypeFor({ kind: 'nullable', inner: { kind: 'list', element: { kind: 'string' } } }),
    ).toBe('list[str] | None')
  })
})

describe('decoderFor', () => {
  it('passes a value through, because parsed JSON already has the right shape', () => {
    expect(decoderFor({ kind: 'string' }, 'arguments[0]')).toBe('arguments[0]')
    expect(decoderFor({ kind: 'list', element: { kind: 'int' } }, 'arguments[1]')).toBe(
      'arguments[1]',
    )
  })

  it('builds a dataclass for a struct, which a dict is not', () => {
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
        'arguments[0]',
      ),
    ).toBe('Edge(to=arguments[0]["to"], weight=arguments[0]["weight"])')
  })

  it('guards a nullable struct against None', () => {
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
    ).toBe('(None if x is None else Edge(to=x["to"]))')
  })
})

describe('dataclassDeclarations', () => {
  it('declares a struct as a dataclass', () => {
    expect(
      dataclassDeclarations([
        {
          kind: 'struct',
          name: 'Edge',
          fields: [
            { name: 'to', type: { kind: 'string' } },
            { name: 'weight', type: { kind: 'float' } },
          ],
        },
      ]),
    ).toBe('@dataclass\nclass Edge:\n    to: str\n    weight: float')
  })

  it('says nothing when there is no struct', () => {
    expect(dataclassDeclarations([{ kind: 'string' }])).toBe('')
  })
})
