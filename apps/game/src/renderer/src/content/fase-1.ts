import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Fase 1 — "o ataque começa" (arrays, strings, funções). Um só NPC, o Marcos (segurança da catraca), na entrada
 * do campus: as duas quests são a primeira prova de NPC em cena de verdade, fora do
 * placeholder da Fase A.
 */

export const placasEmbaralhadasQuest: Quest = questSchema.parse({
  id: 'placas-embaralhadas',
  title: 'Placas embaralhadas',
  npc: 'Marcos',
  objective: 'Fale com o Marcos sobre as placas embaralhadas',
  dialogue: {
    offer: [
      {
        speaker: 'Marcos',
        text: 'Para, para. As placas dos predios amanheceram embaralhadas hoje — parece cifra de Cesar.',
      },
      {
        speaker: 'Marcos',
        text: 'Cada letra andou um numero fixo de posicoes no alfabeto. Decifra pra mim que eu libero o minimapa.',
      },
    ],
    success: [
      {
        speaker: 'Marcos',
        text: 'Voltou tudo ao normal. Toma, o minimapa e seu.',
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

export const catracaTravadaQuest: Quest = questSchema.parse({
  id: 'catraca-travada',
  title: 'Catraca travada',
  npc: 'Marcos',
  objective: 'Resolva a catraca travada com o Marcos',
  requires: { quests: ['placas-embaralhadas'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Marcos',
        text: 'Essa catraca parou de reconhecer todo mundo ontem. Mexeram na validacao do digito verificador.',
      },
      {
        speaker: 'Marcos',
        text: 'A regra: pesos comecam em 2 no ultimo digito da matricula (sem contar o verificador) e sobem 1 a cada posicao pra esquerda.',
      },
      {
        speaker: 'Marcos',
        text: 'Soma tudo, tira o resto da divisao por 11, o verificador e 11 menos esse resto — 10 ou 11 viram 0.',
      },
    ],
    success: [
      {
        speaker: 'Marcos',
        text: 'Catraca liberada. Pode entrar no primeiro predio.',
      },
    ],
  },
  challenge: {
    functionName: 'isValidStudentId',
    parameters: [{ name: 'digits', type: { kind: 'list', element: { kind: 'int' } } }],
    returns: { kind: 'bool' },
    cases: [
      { name: 'Matricula valida', input: [[2, 0, 2, 6, 0, 0, 1, 6]], expected: true },
      { name: 'Digito verificador errado', input: [[2, 0, 2, 6, 0, 0, 1, 7]], expected: false },
      { name: 'Matricula curta valida', input: [[1, 2, 3, 4, 3]], expected: true },
      { name: 'Verificador zero, resto alto', input: [[1, 1, 1, 1, 2, 0]], expected: true },
      { name: 'Outra invalida', input: [[9, 8, 7, 6, 5, 5]], expected: false },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'catraca-aberta' }],
})

export const fase1Quests: readonly Quest[] = [placasEmbaralhadasQuest, catracaTravadaQuest]
