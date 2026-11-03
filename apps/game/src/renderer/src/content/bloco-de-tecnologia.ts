import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 4 — the Bloco de Tecnologia, the final duel against NULL (docs/story.md). The player
 * wins by beating NULL's brute force on the campus network (ADR 0068).
 *
 * `NETWORK` is drawn on purpose so that the shortest path by **weight** is not the one with
 * the fewest hops — POR→TEC through CC directly costs 15, the long way round through BIB,
 * GIN, CC and BLC costs 11 — and big enough, with enough alternative routes, that trying
 * every path costs far more than Dijkstra. The budget sits between the two; the content
 * test (`test/content/o-confronto.test.ts`) keeps it there.
 */
const NETWORK = {
  nodes: [
    { id: 'POR', label: 'Portaria' },
    { id: 'EST', label: 'Estacionamento' },
    { id: 'REI', label: 'Reitoria' },
    { id: 'AUD', label: 'Auditório' },
    { id: 'BIB', label: 'Biblioteca' },
    { id: 'BLA', label: 'Bloco A' },
    { id: 'BLB', label: 'Bloco B' },
    { id: 'LAB', label: 'Laboratórios' },
    { id: 'GIN', label: 'Centro Esportivo' },
    { id: 'CC', label: 'Centro de Convivência' },
    { id: 'BLC', label: 'Bloco C' },
    { id: 'TEC', label: 'Bloco de Tecnologia' },
    { id: 'LAG', label: 'Lagoa' },
    { id: 'TEA', label: 'Teatro' },
  ],
  edges: [
    { from: 'POR', to: 'EST', weight: 4 },
    { from: 'EST', to: 'REI', weight: 5 },
    { from: 'REI', to: 'AUD', weight: 3 },
    { from: 'POR', to: 'BIB', weight: 2 },
    { from: 'EST', to: 'BLA', weight: 2 },
    { from: 'REI', to: 'BLB', weight: 4 },
    { from: 'AUD', to: 'LAB', weight: 2 },
    { from: 'BIB', to: 'BLA', weight: 3 },
    { from: 'BLA', to: 'BLB', weight: 3 },
    { from: 'BLB', to: 'LAB', weight: 6 },
    { from: 'BIB', to: 'GIN', weight: 2 },
    { from: 'BLA', to: 'CC', weight: 4 },
    { from: 'BLB', to: 'BLC', weight: 2 },
    { from: 'LAB', to: 'TEC', weight: 7 },
    { from: 'GIN', to: 'CC', weight: 2 },
    { from: 'CC', to: 'BLC', weight: 3 },
    { from: 'BLC', to: 'TEC', weight: 2 },
    { from: 'GIN', to: 'LAG', weight: 3 },
    { from: 'LAG', to: 'TEA', weight: 2 },
    { from: 'TEA', to: 'TEC', weight: 6 },
    { from: 'CC', to: 'LAG', weight: 2 },
    { from: 'POR', to: 'CC', weight: 10 },
    { from: 'AUD', to: 'TEC', weight: 12 },
  ],
}

/** Dijkstra, expanding each building at most once: what the budget is drawn around. */
const REFERENCE_TYPESCRIPT = `import type { Graph } from './graph.ts'

export function shortestDistance(network: Graph, start: string, end: string): number {
  const distance = new Map<string, number>([[start, 0]])
  const done = new Set<string>()

  while (true) {
    let current: string | undefined
    for (const [node, cost] of distance) {
      if (!done.has(node) && (current === undefined || cost < (distance.get(current) ?? Infinity))) {
        current = node
      }
    }
    if (current === undefined) {
      return -1
    }
    const cost = distance.get(current) ?? 0
    if (current === end) {
      return cost
    }
    done.add(current)
    for (const edge of network.neighbors(current)) {
      if (cost + edge.weight < (distance.get(edge.to) ?? Infinity)) {
        distance.set(edge.to, cost + edge.weight)
      }
    }
  }
}
`

export const oConfrontoQuest: Quest = questSchema.parse({
  id: 'o-confronto',
  title: 'O confronto',
  npc: 'NULL',
  objective: 'Enfrente o NULL no Bloco de Tecnologia',
  requires: { quests: ['fila-do-centro-de-convivencia'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'NULL',
        text: '// entao chegou ate aqui. cada predio que voce consertou, eu senti.',
      },
      {
        speaker: 'NULL',
        text: '// me diz a menor distancia da portaria ate mim, pela rede. eu ja sei a resposta — a questao e se voce chega nela gastando menos que a minha forca bruta.',
      },
    ],
    overBudget: [
      {
        speaker: 'NULL',
        text: '// correto. e lento. minha forca bruta ainda e mais rapida.',
      },
    ],
    success: [
      {
        speaker: 'NULL',
        text: '// ...impossivel. nenhuma forca bruta vence isso.',
      },
      {
        speaker: 'Davi',
        text: 'Ué, as telas voltaram! Perdi alguma coisa?',
      },
    ],
  },
  challenge: {
    functionName: 'shortestDistance',
    parameters: [
      { name: 'network', type: { kind: 'graph' } },
      { name: 'start', type: { kind: 'string' } },
      { name: 'end', type: { kind: 'string' } },
    ],
    returns: { kind: 'int' },
    cases: [
      { name: 'Ate o Bloco de Tecnologia', input: [NETWORK, 'POR', 'TEC'], expected: 11 },
      { name: 'Ate o Centro de Convivencia', input: [NETWORK, 'POR', 'CC'], expected: 6 },
      { name: 'Vizinho direto', input: [NETWORK, 'POR', 'BIB'], expected: 2 },
      { name: 'Origem e destino iguais', input: [NETWORK, 'POR', 'POR'], expected: 0 },
    ],
    // NULL's brute force tries every path; a Dijkstra spends well under 100 (ADR 0068).
    opsBudget: 100,
    referenceSolutions: { typescript: REFERENCE_TYPESCRIPT },
  },
  onSuccess: [
    { kind: 'setFlag', flag: 'null-derrotado' },
    { kind: 'setFlag', flag: 'campus-restaurado' },
  ],
})
