import { describe, expect, it } from 'vitest'
import { formatTypeSpec, typeSpecSchema } from '../src/type-spec.js'

describe('formatTypeSpec', () => {
  it('renderiza a assinatura do desafio de caminho minimo', () => {
    expect(
      formatTypeSpec({ kind: 'nullable', inner: { kind: 'list', element: { kind: 'string' } } }),
    ).toBe('nullable<list<string>>')
  })

  it('renderiza tipos aninhados', () => {
    expect(
      formatTypeSpec({
        kind: 'map',
        key: { kind: 'string' },
        value: { kind: 'list', element: { kind: 'int' } },
      }),
    ).toBe('map<string, list<int>>')
  })

  it('usa o nome do struct', () => {
    expect(
      formatTypeSpec({
        kind: 'struct',
        name: 'Aresta',
        fields: [{ name: 'peso', type: { kind: 'float' } }],
      }),
    ).toBe('Aresta')
  })
})

describe('typeSpecSchema', () => {
  it('aceita um tipo recursivo valido', () => {
    expect(typeSpecSchema.safeParse({ kind: 'list', element: { kind: 'graph' } }).success).toBe(
      true,
    )
  })

  it('rejeita um tipo invalido no nivel aninhado', () => {
    expect(typeSpecSchema.safeParse({ kind: 'list', element: { kind: 'tupla' } }).success).toBe(
      false,
    )
  })
})
