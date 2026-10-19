import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 2 — the Biblioteca, with Dona Célia. NULL speaks to the player for the first time, and
 * the restored data leaves a trail to the Centro de Convivência (docs/story.md).
 *
 * The answer is the path walked down a binary search tree, not just whether the book is
 * there: sorting the list or scanning it cannot produce that path, so only a real tree
 * passes. A miss returns an empty path.
 */
export const arvoreDoAcervoQuest: Quest = questSchema.parse({
  id: 'arvore-do-acervo',
  title: 'A árvore do acervo',
  npc: 'Dona Célia',
  objective: 'Fale com Dona Célia sobre o acervo embaralhado',
  requires: { quests: ['placas-embaralhadas'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Dona Célia',
        text: 'O acervo é uma árvore: cada código vai pra esquerda se for menor, pra direita se for maior. Ou era, até hoje cedo.',
      },
      {
        speaker: 'NULL',
        text: '// boa sorte, calouro. trinta mil livros e nenhuma arvore de pe.',
      },
      {
        speaker: 'Dona Célia',
        text: 'Monta a árvore de novo, na ordem em que os códigos chegaram, e me diz o caminho até o livro. Se ele não estiver lá, caminho vazio.',
      },
    ],
    success: [
      {
        speaker: 'Dona Célia',
        text: 'Achou. E olha: no fim desse caminho tem um acesso estranho, vindo do Centro de Convivência.',
      },
    ],
  },
  challenge: {
    functionName: 'findBookPath',
    parameters: [
      { name: 'codes', type: { kind: 'list', element: { kind: 'int' } } },
      { name: 'target', type: { kind: 'int' } },
    ],
    returns: { kind: 'list', element: { kind: 'int' } },
    cases: [
      { name: 'Livro na raiz', input: [[50, 30, 70, 20, 40, 60, 80], 50], expected: [50] },
      {
        name: 'Livro a esquerda',
        input: [[50, 30, 70, 20, 40, 60, 80], 40],
        expected: [50, 30, 40],
      },
      {
        name: 'Livro a direita',
        input: [[50, 30, 70, 20, 40, 60, 80], 60],
        expected: [50, 70, 60],
      },
      {
        name: 'Arvore torta',
        input: [[10, 20, 30, 40], 40],
        expected: [10, 20, 30, 40],
      },
      { name: 'Livro que nao existe', input: [[50, 30, 70, 20, 40, 60, 80], 65], expected: [] },
      { name: 'Acervo vazio', input: [[], 1], expected: [] },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'acervo-organizado' }],
})
