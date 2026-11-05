import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 2 — the Biblioteca, with Dona Célia. NULL speaks to the player for the first time, and
 * the restored data leaves a trail to the Centro de Convivência (docs/story.md).
 *
 * The answer is the path walked down a binary search tree, not just whether the book is
 * there: sorting the list or scanning it cannot produce that path, so only a real tree
 * passes. A miss returns an empty path.
 */
/**
 * Builds the tree in arrival order, then walks it from the root, writing down each code on
 * the way. Also the solution `docs/solucoes.md` explains.
 */
const REFERENCE_TYPESCRIPT = `type Shelf = { code: number; left: Shelf | null; right: Shelf | null }

export function findBookPath(codes: number[], target: number): number[] {
  let root: Shelf | null = null
  for (const code of codes) {
    root = insert(root, code)
  }

  const path: number[] = []
  let current = root
  while (current !== null) {
    path.push(current.code)
    if (target === current.code) {
      return path
    }
    current = target < current.code ? current.left : current.right
  }
  // Fell off the tree: the book is not in the collection.
  return []
}

function insert(shelf: Shelf | null, code: number): Shelf {
  if (shelf === null) {
    return { code, left: null, right: null }
  }
  if (code < shelf.code) {
    shelf.left = insert(shelf.left, code)
  } else {
    shelf.right = insert(shelf.right, code)
  }
  return shelf
}
`

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
    examples: [
      { input: [[8, 3, 10, 1, 6], 6], expected: [8, 3, 6] },
      { input: [[8, 3, 10, 1, 6], 10], expected: [8, 10] },
      { input: [[8, 3, 10], 5], expected: [] },
    ],
    guide: {
      about:
        'O acervo é uma árvore binária de busca. O primeiro código da lista é a raiz; cada código seguinte desce a partir dela, para a esquerda se for menor e para a direita se for maior, até achar um lugar vazio. Monte a árvore, procure o livro a partir da raiz e devolva os códigos por onde passou. Se cair num lugar vazio, o livro não está lá: devolva a lista vazia.',
      hints: [
        'Monte a árvore na ordem em que os códigos chegaram, sem ordenar a lista: a ordem muda a forma da árvore e o caminho.',
        'Cada nó guarda um código e dois lados, esquerdo e direito, que começam vazios.',
        'Para inserir, desça a partir da raiz comparando códigos até achar o lado vazio onde o novo código entra.',
        'Na busca, anote cada código visitado; ao encontrar o livro, a lista anotada é a resposta.',
        'Lista de códigos vazia: não há árvore, então a resposta é a lista vazia.',
      ],
    },
    referenceSolutions: { typescript: REFERENCE_TYPESCRIPT },
  },
  onSuccess: [{ kind: 'setFlag', flag: 'acervo-organizado' }],
})
