import { describe, expect, it } from 'vitest'
import { boxedTypeFor, decoderFor, javaTypeFor, recordDeclarations } from '../src/type-mapping.js'

describe('javaTypeFor', () => {
  it('maps the scalars to primitives', () => {
    expect(javaTypeFor({ kind: 'int' })).toBe('int')
    expect(javaTypeFor({ kind: 'float' })).toBe('double')
    expect(javaTypeFor({ kind: 'bool' })).toBe('boolean')
    expect(javaTypeFor({ kind: 'string' })).toBe('String')
  })

  it('boxes what goes inside a generic, because Java generics hold objects', () => {
    expect(javaTypeFor({ kind: 'list', element: { kind: 'int' } })).toBe('List<Integer>')
    expect(javaTypeFor({ kind: 'map', key: { kind: 'string' }, value: { kind: 'float' } })).toBe(
      'Map<String, Double>',
    )
  })

  it('boxes a nullable, so zero and absent stay different', () => {
    expect(javaTypeFor({ kind: 'nullable', inner: { kind: 'int' } })).toBe('Integer')
    expect(boxedTypeFor({ kind: 'bool' })).toBe('Boolean')
  })

  it('leaves a nullable String alone, since it already takes null', () => {
    expect(javaTypeFor({ kind: 'nullable', inner: { kind: 'string' } })).toBe('String')
  })

  it('maps the shortest-path signature', () => {
    expect(
      javaTypeFor({ kind: 'nullable', inner: { kind: 'list', element: { kind: 'string' } } }),
    ).toBe('List<String>')
  })
})

describe('decoderFor', () => {
  it('decodes a scalar', () => {
    expect(decoderFor({ kind: 'string' }, 'input.get(0)')).toBe('Json.asString(input.get(0))')
    expect(decoderFor({ kind: 'int' }, 'input.get(1)')).toBe('Json.asInt(input.get(1))')
  })

  it('decodes a list through the boxed form of its element', () => {
    expect(decoderFor({ kind: 'list', element: { kind: 'int' } }, 'x')).toBe(
      'Json.asList(x, v0 -> Json.asBoxedInt(v0))',
    )
  })

  it('names each lambda argument once, even nested', () => {
    const decoder = decoderFor(
      { kind: 'list', element: { kind: 'list', element: { kind: 'string' } } },
      'x',
    )
    expect(decoder).toBe('Json.asList(x, v0 -> Json.asList(v0, v1 -> Json.asString(v1)))')
  })

  it('decodes a nullable int as the boxed form', () => {
    expect(decoderFor({ kind: 'nullable', inner: { kind: 'int' } }, 'x')).toBe('Json.asBoxedInt(x)')
  })
})

describe('recordDeclarations', () => {
  it('declares a struct as a record', () => {
    expect(
      recordDeclarations([
        {
          kind: 'struct',
          name: 'Edge',
          fields: [
            { name: 'to', type: { kind: 'string' } },
            { name: 'weight', type: { kind: 'float' } },
          ],
        },
      ]),
    ).toBe('record Edge(String to, double weight) {}')
  })

  it('says nothing when there is no struct', () => {
    expect(recordDeclarations([{ kind: 'int' }])).toBe('')
  })
})
