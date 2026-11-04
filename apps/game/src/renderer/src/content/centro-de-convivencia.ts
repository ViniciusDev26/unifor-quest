import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 3 — the Centro de Convivência (the RU), with Seu Raimundo. His campus rumor about the
 * Bloco de Tecnologia completes NULL's trail (docs/story.md).
 */
export const filaDoCentroDeConvivenciaQuest: Quest = questSchema.parse({
  id: 'fila-do-centro-de-convivencia',
  title: 'Fila do Centro de Convivência',
  npc: 'Seu Raimundo',
  objective: 'Ajude Seu Raimundo a organizar a fila do Centro de Convivência',
  requires: { quests: ['arvore-do-acervo'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Seu Raimundo',
        text: 'O sistema do RU travou e essa fila não anda. Cada vez que alguém é atendido, eu perco a conta.',
      },
      {
        speaker: 'Seu Raimundo',
        text: 'Me diz quem está na frente depois que um tanto de gente já foi atendida, sem eu ter que recontar.',
      },
    ],
    success: [
      {
        speaker: 'Seu Raimundo',
        text: 'Agora sim, a fila anda! Sabe o que me contaram? As luzes do Bloco de Tecnologia nunca apagam, nem de madrugada.',
      },
      {
        speaker: 'Seu Raimundo',
        text: 'Dizem que é fantasma. Eu acho que é coisa de computador.',
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
    examples: [
      { input: [['Rui', 'Lia', 'Téo'], 1], expected: 'Lia' },
      { input: [['Rui', 'Lia'], 0], expected: 'Rui' },
      { input: [['Rui'], 3], expected: null },
    ],
    guide: {
      about:
        'A fila do RU é uma fila de verdade: quem chegou primeiro é atendido primeiro. A lista vem da frente para o fim. Depois de served pessoas atendidas, diga quem está na frente agora. Se todo mundo já foi atendido, não sobrou ninguém: devolva nulo.',
      hints: [
        'Atender alguém é tirar a pessoa da frente da fila.',
        'Não precisa apagar ninguém: guarde a posição da frente e avance uma casa a cada atendimento.',
        'As posições começam do zero: depois de 2 atendimentos, a frente está na posição 2.',
        'Se served for maior ou igual ao tamanho da fila, a resposta é nulo (null, None ou nil, conforme a linguagem).',
      ],
    },
    referenceSolutions: {},
  },
  onSuccess: [
    { kind: 'setFlag', flag: 'centro-de-convivencia-reaberto' },
    { kind: 'setFlag', flag: 'bloco-tecnologia-revelado' },
  ],
})
