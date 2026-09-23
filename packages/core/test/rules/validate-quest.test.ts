import { describe, expect, it } from 'vitest'
import { validateQuest } from '../../src/rules/validate-quest.js'
import { helloWorld, questWith } from '../fixtures.js'

describe('validateQuest', () => {
  it('accepts a coherent quest', () => {
    expect(validateQuest(helloWorld)).toEqual([])
  })

  it('catches an argument that does not match the declared parameter', () => {
    const broken = questWith({
      challenge: {
        ...helloWorld.challenge,
        cases: [{ name: 'Numero no lugar do nome', input: [7], expected: 'Ola, 7!' }],
      },
    })
    expect(validateQuest(broken)).toEqual([
      'hello-world.cases[0] (Numero no lugar do nome).name: expected string, got number',
    ])
  })

  it('catches the wrong number of arguments', () => {
    const broken = questWith({
      challenge: {
        ...helloWorld.challenge,
        cases: [{ name: 'Sem argumento', input: [], expected: 'Ola!' }],
      },
    })
    expect(validateQuest(broken)[0]).toContain('expected 1 argument(s), got 0')
  })

  it('catches an expected value that does not match the return type', () => {
    const broken = questWith({
      challenge: {
        ...helloWorld.challenge,
        cases: [{ name: 'Retorno errado', input: ['Vini'], expected: 42 }],
      },
    })
    expect(validateQuest(broken)[0]).toContain('expected: expected string, got number')
  })

  it('catches duplicate case names, which would collapse into one outcome', () => {
    const broken = questWith({
      challenge: {
        ...helloWorld.challenge,
        cases: [
          { name: 'Nome simples', input: ['Vini'], expected: 'Ola, Vini!' },
          { name: 'Nome simples', input: ['Ana'], expected: 'Ola, Ana!' },
        ],
      },
    })
    expect(validateQuest(broken)).toEqual([
      'hello-world.cases[1] (Nome simples): duplicate case name',
    ])
  })

  it('catches customTests with no reference solution at all', () => {
    const broken = questWith({
      challenge: { ...helloWorld.challenge, customTests: true, referenceSolutions: {} },
    })
    expect(validateQuest(broken)[0]).toContain('no language has a reference solution')
  })
})
