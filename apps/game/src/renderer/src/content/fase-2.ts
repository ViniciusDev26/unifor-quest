import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Fase 2 — "o rastro começa" (ordenação, busca binária). Ato 1 termina aqui: a Biblioteca,
 * com Dona Célia, a bibliotecária — e é no fim desta fase que a primeira fala do NULL
 * aparece (docs/story.md).
 */

export const acervoEmbaralhadoQuest: Quest = questSchema.parse({
  id: 'acervo-embaralhado',
  title: 'Acervo embaralhado',
  npc: 'Dona Célia',
  objective: 'Fale com Dona Célia sobre o acervo embaralhado',
  requires: { quests: ['catraca-travada'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Dona Célia',
        text: 'Os códigos dos livros amanheceram fora de ordem. Não consigo achar nada nessa estante.',
      },
      {
        speaker: 'Dona Célia',
        text: 'Se você ordenar esses códigos pra mim, do menor pro maior, eu arrumo o resto.',
      },
    ],
    success: [
      {
        speaker: 'Dona Célia',
        text: 'Perfeito. Agora sim consigo organizar a estante de novo.',
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

export const livroComAPistaQuest: Quest = questSchema.parse({
  id: 'livro-com-a-pista',
  title: 'O livro com a pista',
  npc: 'Dona Célia',
  objective: 'Ache o livro certo pra Dona Célia, por código',
  requires: { quests: ['acervo-embaralhado'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Dona Célia',
        text: 'Tem um livro aqui que ninguém pediu em anos, mas o código dele some da minha cabeça toda vez.',
      },
      {
        speaker: 'Dona Célia',
        text: 'Já que a estante está ordenada, acha esse código pra mim sem ler livro por livro.',
      },
    ],
    success: [
      {
        speaker: 'Dona Célia',
        text: 'Achou rapido assim? Pegue o livro — tem algo estranho escrito na ultima pagina.',
      },
    ],
  },
  challenge: {
    functionName: 'findBookIndex',
    parameters: [
      { name: 'codes', type: { kind: 'list', element: { kind: 'int' } } },
      { name: 'target', type: { kind: 'int' } },
    ],
    returns: { kind: 'int' },
    cases: [
      { name: 'No meio', input: [[2, 7, 19, 42, 91], 19], expected: 2 },
      { name: 'No inicio', input: [[2, 7, 19, 42, 91], 2], expected: 0 },
      { name: 'No fim', input: [[2, 7, 19, 42, 91], 91], expected: 4 },
      { name: 'Nao existe', input: [[2, 7, 19, 42, 91], 50], expected: -1 },
      { name: 'Lista vazia', input: [[], 1], expected: -1 },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'null-primeira-mensagem' }],
})

export const fase2Quests: readonly Quest[] = [acervoEmbaralhadoQuest, livroComAPistaQuest]
