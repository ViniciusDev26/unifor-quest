import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Fase 3 — início do Ato 2 (fila, pilha, hash map). O rastro do NULL leva do Centro de
 * Convivência ao Auditório até o primeiro indício do Bloco de Tecnologia (docs/story.md).
 */

export const filaDoCentroDeConvivenciaQuest: Quest = questSchema.parse({
  id: 'fila-do-centro-de-convivencia',
  title: 'Fila do Centro de Convivência',
  npc: 'Seu Raimundo',
  objective: 'Ajude Seu Raimundo a organizar a fila do Centro de Convivência',
  requires: { quests: ['livro-com-a-pista'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Seu Raimundo',
        text: 'Essa fila não anda. Toda vez que alguém desiste e sai, eu perco a conta de quem é o proximo.',
      },
      {
        speaker: 'Seu Raimundo',
        text: 'Me diz quem esta na frente depois que um tanto de gente ja foi atendida, sem eu ter que recontar.',
      },
    ],
    success: [
      {
        speaker: 'Seu Raimundo',
        text: 'Isso! Agora a fila anda direito. Pode abrir as portas.',
      },
    ],
  },
  challenge: {
    functionName: 'nextToBeServed',
    parameters: [
      { name: 'queue', type: { kind: 'list', element: { kind: 'string' } } },
      { name: 'served', type: { kind: 'int' } },
    ],
    returns: { kind: 'nullable', inner: { kind: 'string' } },
    cases: [
      {
        name: 'No meio da fila',
        input: [['Ana', 'Bia', 'Caio', 'Duda'], 2],
        expected: 'Caio',
      },
      { name: 'Ninguem atendido ainda', input: [['Ana', 'Bia'], 0], expected: 'Ana' },
      { name: 'Ultimo da fila', input: [['Ana', 'Bia', 'Caio'], 2], expected: 'Caio' },
      { name: 'Fila ja vazia', input: [['Ana', 'Bia'], 2], expected: null },
      { name: 'Fila vazia desde o inicio', input: [[], 0], expected: null },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'centro-de-convivencia-reaberto' }],
})

export const painelDoAuditorioQuest: Quest = questSchema.parse({
  id: 'painel-do-auditorio',
  title: 'Painel do auditório',
  npc: 'Davi',
  objective: 'Destrave o painel do auditório com Davi',
  requires: { quests: ['fila-do-centro-de-convivencia'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Davi',
        text: 'Cara, eu tentei consertar o painel e so deixei pior. Agora ele so mostra um texto cheio de parenteses.',
      },
      {
        speaker: 'Davi',
        text: 'Ele só libera o video se alguem confirmar que os parenteses, colchetes e chaves estao todos fechados certinho.',
      },
    ],
    success: [
      {
        speaker: 'Davi',
        text: 'Funcionou! Olha essa pista no video — isso aponta pro Bloco de Tecnologia.',
      },
    ],
  },
  challenge: {
    functionName: 'isBalanced',
    parameters: [{ name: 'expression', type: { kind: 'string' } }],
    returns: { kind: 'bool' },
    cases: [
      { name: 'Balanceado simples', input: ['(a[b]{c})'], expected: true },
      { name: 'Aninhado', input: ['{[()()]}'], expected: true },
      { name: 'Fechamento errado', input: ['(a[b)c]'], expected: false },
      { name: 'Abre sem fechar', input: ['([a]'], expected: false },
      { name: 'Sem parenteses nenhum', input: ['abc'], expected: true },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'painel-auditorio-liberado' }],
})

export const rastreandoONullQuest: Quest = questSchema.parse({
  id: 'rastreando-o-null',
  title: 'Rastreando o NULL',
  npc: 'Lia',
  objective: 'Ajude Lia a rastrear as requisições suspeitas',
  requires: { quests: ['painel-do-auditorio'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Lia',
        text: 'O log do NTI está cheio de requisições. Preciso saber quantas vieram de cada origem.',
      },
      {
        speaker: 'Lia',
        text: 'Conta pra mim, origem por origem, quantas vezes cada uma aparece nesse log.',
      },
    ],
    success: [
      {
        speaker: 'Lia',
        text: 'Uma origem aparece muito mais que as outras. É o Bloco de Tecnologia.',
      },
    ],
  },
  challenge: {
    functionName: 'countByOrigin',
    parameters: [{ name: 'requests', type: { kind: 'list', element: { kind: 'string' } } }],
    returns: { kind: 'map', key: { kind: 'string' }, value: { kind: 'int' } },
    cases: [
      {
        name: 'Origens repetidas',
        input: [['BIB', 'CC', 'BIB', 'TEC', 'BIB', 'CC']],
        expected: { BIB: 3, CC: 2, TEC: 1 },
      },
      { name: 'Uma origem so', input: [['TEC', 'TEC']], expected: { TEC: 2 } },
      { name: 'Log vazio', input: [[]], expected: {} },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'bloco-tecnologia-revelado' }],
})

export const fase3Quests: readonly Quest[] = [
  filaDoCentroDeConvivenciaQuest,
  painelDoAuditorioQuest,
  rastreandoONullQuest,
]
