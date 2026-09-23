import { type Quest, questSchema } from '../src/entities/quest.js'

/**
 * The hello world quest that closes Phase A (ADR 0029), used as the baseline in tests.
 * Its text is in Portuguese because it is game content, not code (ADR 0031).
 */
export const helloWorld: Quest = questSchema.parse({
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
})

/** The same quest with some parts replaced, so a test can show only what it cares about. */
export function questWith(overrides: Partial<Quest>): Quest {
  return { ...helloWorld, ...overrides }
}
