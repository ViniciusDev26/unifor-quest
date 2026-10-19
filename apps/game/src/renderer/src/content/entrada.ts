import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 1 — the portaria, where the game starts (ADR 0061). The campus screens have just gone
 * dark showing `NULL`; Davi tried to help and made it worse; Marcos keeps everyone in until
 * the signs are readable again (docs/story.md).
 */
export const placasEmbaralhadasQuest: Quest = questSchema.parse({
  id: 'placas-embaralhadas',
  title: 'Placas embaralhadas',
  npc: 'Marcos',
  objective: 'Fale com o Marcos sobre as placas embaralhadas',
  dialogue: {
    offer: [
      {
        speaker: 'Davi',
        text: 'Eu só reiniciei o painel! Juro! Aí apareceu esse NULL e as placas viraram sopa de letrinha.',
      },
      {
        speaker: 'Marcos',
        text: 'Ninguém entra no campus com as placas assim. Parece cifra de César: cada letra andou um número fixo de posições.',
      },
      {
        speaker: 'Marcos',
        text: 'Você é de Computação, não é? Decifra pra mim que eu libero a entrada.',
      },
    ],
    success: [
      {
        speaker: 'Marcos',
        text: 'Voltou tudo ao normal. Pode passar — e leva o minimapa.',
      },
      {
        speaker: 'Davi',
        text: 'Viu? Eu ajudei. Indiretamente.',
      },
    ],
  },
  challenge: {
    functionName: 'decodeSign',
    parameters: [
      { name: 'text', type: { kind: 'string' } },
      { name: 'shift', type: { kind: 'int' } },
    ],
    returns: { kind: 'string' },
    cases: [
      { name: 'Placa da Biblioteca', input: ['ELEOLRWHFD', 3], expected: 'BIBLIOTECA' },
      {
        name: 'Frase com espaco e minusculas',
        input: ['Hjsywt Jxutwynat', 5],
        expected: 'Centro Esportivo',
      },
      {
        name: 'Deslocamento maior',
        input: ['Hbkpavypv Jluayhs', 7],
        expected: 'Auditorio Central',
      },
      { name: 'Letra no limite do alfabeto', input: ['Afcsb', 1], expected: 'Zebra' },
      { name: 'Sem deslocamento', input: ['Sem Cifra Nenhuma', 0], expected: 'Sem Cifra Nenhuma' },
    ],
    // No language is checked ahead of time (ADR 0007's escape hatch is only for
    // customTests): every language stays offered regardless.
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'minimapa-liberado' }],
})
