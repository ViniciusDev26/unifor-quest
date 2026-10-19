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
  requires: { quests: ['acervo-embaralhado'], flags: [] },
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
    referenceSolutions: {},
  },
  onSuccess: [
    { kind: 'setFlag', flag: 'centro-de-convivencia-reaberto' },
    { kind: 'setFlag', flag: 'bloco-tecnologia-revelado' },
  ],
})
