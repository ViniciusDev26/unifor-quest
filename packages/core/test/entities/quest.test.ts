import { describe, expect, it } from 'vitest'
import { questSchema } from '../../src/entities/quest.js'

const helloWorld = {
  id: 'hello-world',
  title: 'Primeiras palavras',
  npc: 'monitor',
  dialogue: {
    offer: [{ speaker: 'Monitor', text: 'Escreve uma funcao que cumprimenta alguem.' }],
    success: [{ speaker: 'Monitor', text: 'E assim que comeca.' }],
  },
  challenge: {
    functionName: 'greet',
    parameters: [{ name: 'name', type: { kind: 'string' } }],
    returns: { kind: 'string' },
    cases: [{ name: 'Nome simples', input: ['Vini'], expected: 'Ola, Vini!' }],
    referenceSolutions: { typescript: 'export function greet() {}' },
  },
}

describe('questSchema', () => {
  it('fills in the defaults of a minimal quest', () => {
    const parsed = questSchema.parse(helloWorld)
    expect(parsed.requires).toEqual({ quests: [], flags: [] })
    expect(parsed.onSuccess).toEqual([])
    expect(parsed.challenge.customTests).toBe(false)
  })

  it('accepts prerequisites by quest id and by world flag', () => {
    const parsed = questSchema.parse({
      ...helloWorld,
      requires: { quests: ['hello-world'], flags: ['north-door-unlocked'] },
    })
    expect(parsed.requires.quests).toEqual(['hello-world'])
    expect(parsed.requires.flags).toEqual(['north-door-unlocked'])
  })

  it('accepts a declared effect', () => {
    const parsed = questSchema.parse({
      ...helloWorld,
      onSuccess: [{ kind: 'setFlag', flag: 'met-the-monitor' }],
    })
    expect(parsed.onSuccess).toEqual([{ kind: 'setFlag', flag: 'met-the-monitor' }])
  })

  it('rejects an effect outside the closed vocabulary', () => {
    const parsed = questSchema.safeParse({
      ...helloWorld,
      onSuccess: [{ kind: 'giveTheAnswerAway' }],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects a challenge with no test cases', () => {
    const parsed = questSchema.safeParse({
      ...helloWorld,
      challenge: { ...helloWorld.challenge, cases: [] },
    })
    expect(parsed.success).toBe(false)
  })
})
