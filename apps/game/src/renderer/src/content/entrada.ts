import { type Cutscene, cutsceneSchema, type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 1 — the portaria, where the game starts (ADR 0061). The campus screens have just gone
 * dark showing `NULL`; Davi tried to help and made it worse; Marcos keeps everyone in until
 * the signs are readable again (docs/story.md).
 */
/**
 * Walks every letter `shift` places back, wrapping around the alphabet. Also the solution
 * `docs/solucoes.md` explains.
 */
const REFERENCE_TYPESCRIPT = `export function decodeSign(text: string, shift: number): string {
  let decoded = ''
  for (const char of text) {
    const base = char >= 'A' && char <= 'Z' ? 65 : char >= 'a' && char <= 'z' ? 97 : null
    if (base === null) {
      // Not a letter (a space, a digit): it was never shifted.
      decoded += char
      continue
    }
    const position = char.charCodeAt(0) - base
    // % of a negative number is negative in JavaScript: + 26 brings it back to 0..25.
    const original = (((position - shift) % 26) + 26) % 26
    decoded += String.fromCharCode(base + original)
  }
  return decoded
}
`

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
    examples: [
      { input: ['Fdpsxv', 3], expected: 'Campus' },
      { input: ['Exspyb', 10], expected: 'Unifor' },
      { input: ['Dnqeq V', 2], expected: 'Bloco T' },
    ],
    guide: {
      about:
        'Cifra de César: cada letra da placa foi empurrada shift posições para a frente no alfabeto. Para decifrar, ande shift posições para trás. Maiúscula continua maiúscula, minúscula continua minúscula, e o que não é letra (como o espaço) fica como está.',
      hints: [
        'Percorra o texto caractere por caractere e vá montando o resultado.',
        "Transforme a letra numa posição de 0 a 25 subtraindo o código de 'A' (ou de 'a', nas minúsculas).",
        'Volte shift posições e use o resto da divisão por 26 para dar a volta no alfabeto: antes do A vem o Z.',
        'Cuidado: em várias linguagens o % de um número negativo dá negativo. ((posição - shift) % 26 + 26) % 26 sempre cai entre 0 e 25.',
        "No fim, some de volta o código de 'A' (ou de 'a') para ter a letra decifrada.",
      ],
    },
    // Every language stays offered regardless (ADR 0007's escape hatch is only for
    // customTests); the reference is what the content test runs (ADR 0014).
    referenceSolutions: { typescript: REFERENCE_TYPESCRIPT },
  },
  onSuccess: [{ kind: 'setFlag', flag: 'minimapa-liberado' }],
})

/**
 * The opening (docs/story.md, Portaria; ADR 0066): the calouro and Davi walk in, the wall
 * screens go dark showing NULL, and Davi "fixes" it by resetting the sign panel, which
 * leaves the signs scrambled. Nobody speaks — Davi's excuse is the first line of the
 * conversation with Marcos, right after.
 */
export const aberturaCutscene: Cutscene = cutsceneSchema.parse({
  id: 'abertura',
  scene: 'entrada',
  steps: [
    { kind: 'spawn', actor: 'davi', at: { x: 9.5, y: 9.5 } },
    { kind: 'fade', direction: 'in', ms: 1000 },
    { kind: 'move', actor: 'davi', to: { x: 10, y: 7 } },
    { kind: 'move', actor: 'calouro', to: { x: 8, y: 6.5 } },
    { kind: 'wait', ms: 500 },
    { kind: 'cue', name: 'telas-null' },
    { kind: 'wait', ms: 800 },
    { kind: 'move', actor: 'davi', to: { x: 12.5, y: 3 } },
    { kind: 'wait', ms: 300 },
    { kind: 'cue', name: 'painel-reinicia' },
    { kind: 'wait', ms: 600 },
  ],
})
