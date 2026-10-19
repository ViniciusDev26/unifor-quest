import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 2 — the Biblioteca, with Dona Célia. NULL speaks to the player for the first time, and
 * the restored data leaves a trail to the Centro de Convivência (docs/story.md).
 */
export const acervoEmbaralhadoQuest: Quest = questSchema.parse({
  id: 'acervo-embaralhado',
  title: 'Acervo embaralhado',
  npc: 'Dona Célia',
  objective: 'Fale com Dona Célia sobre o acervo embaralhado',
  requires: { quests: ['placas-embaralhadas'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Dona Célia',
        text: 'Os códigos dos livros amanheceram fora de ordem. Não acho mais nada nessa estante.',
      },
      {
        speaker: 'NULL',
        text: '// boa sorte, calouro. trinta mil livros e nenhum no lugar.',
      },
      {
        speaker: 'Dona Célia',
        text: 'Quem escreveu isso no meu terminal? Ordena esses códigos pra mim, do menor pro maior.',
      },
    ],
    success: [
      {
        speaker: 'Dona Célia',
        text: 'Perfeito. E olha: no meio dos registros tem um acesso estranho, vindo do Centro de Convivência.',
      },
    ],
  },
  challenge: {
    functionName: 'sortShelfCodes',
    parameters: [{ name: 'codes', type: { kind: 'list', element: { kind: 'int' } } }],
    returns: { kind: 'list', element: { kind: 'int' } },
    cases: [
      { name: 'Fora de ordem', input: [[42, 7, 19, 3]], expected: [3, 7, 19, 42] },
      { name: 'Ja ordenado', input: [[1, 2, 3]], expected: [1, 2, 3] },
      { name: 'Com repetidos', input: [[5, 5, 2, 8, 2]], expected: [2, 2, 5, 5, 8] },
      { name: 'Um so codigo', input: [[9]], expected: [9] },
      { name: 'Lista vazia', input: [[]], expected: [] },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'acervo-organizado' }],
})
