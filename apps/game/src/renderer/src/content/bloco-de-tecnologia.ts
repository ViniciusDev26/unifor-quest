import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 4 — the Bloco de Tecnologia, the final duel against NULL (docs/story.md). The player
 * wins by beating NULL's brute force on the campus network (ADR 0068).
 *
 * `NETWORK` is the campus's **computer** network, not the paths drawn on the map (ADR 0071):
 * routers, switches and servers of the places in the game, weighted by latency. It is drawn
 * so that the fastest route is not the one with the fewest hops — POR→TEC through CCV
 * directly costs 15, the long way round through BIB, CE, CCV and SWS costs 11 — and with
 * enough alternative links that trying every path costs far more than Dijkstra. The budget
 * sits between the two; the content test (`test/content/o-confronto.test.ts`) keeps it there.
 */
const NETWORK = {
  nodes: [
    { id: 'POR', label: 'Portaria' },
    { id: 'WIFI', label: 'Wi-Fi da Praça' },
    { id: 'FW', label: 'Firewall' },
    { id: 'DNS', label: 'Servidor DNS' },
    { id: 'AUD', label: 'Auditório' },
    { id: 'BIB', label: 'Biblioteca' },
    { id: 'SWN', label: 'Switch Norte' },
    { id: 'CAM', label: 'Câmeras' },
    { id: 'CORE', label: 'Núcleo da rede' },
    { id: 'ARQ', label: 'Servidor de Arquivos' },
    { id: 'CE', label: 'Centro Esportivo' },
    { id: 'CCV', label: 'Centro de Convivência' },
    { id: 'SWS', label: 'Switch Sul' },
    { id: 'LAG', label: 'Ponto de acesso da Lagoa' },
    { id: 'RU', label: 'Servidor do RU' },
    { id: 'TEC', label: 'Bloco de Tecnologia' },
  ],
  edges: [
    { from: 'POR', to: 'WIFI', weight: 4 },
    { from: 'WIFI', to: 'FW', weight: 5 },
    { from: 'FW', to: 'AUD', weight: 3 },
    { from: 'FW', to: 'DNS', weight: 2 },
    { from: 'DNS', to: 'CORE', weight: 3 },
    { from: 'POR', to: 'BIB', weight: 2 },
    { from: 'WIFI', to: 'SWN', weight: 2 },
    { from: 'FW', to: 'CORE', weight: 4 },
    { from: 'AUD', to: 'ARQ', weight: 2 },
    { from: 'BIB', to: 'SWN', weight: 3 },
    { from: 'SWN', to: 'CORE', weight: 3 },
    { from: 'SWN', to: 'CAM', weight: 2 },
    { from: 'CAM', to: 'CE', weight: 3 },
    { from: 'CORE', to: 'ARQ', weight: 6 },
    { from: 'BIB', to: 'CE', weight: 2 },
    { from: 'SWN', to: 'CCV', weight: 4 },
    { from: 'CORE', to: 'SWS', weight: 2 },
    { from: 'ARQ', to: 'TEC', weight: 7 },
    { from: 'CE', to: 'CCV', weight: 2 },
    { from: 'CCV', to: 'SWS', weight: 3 },
    { from: 'SWS', to: 'TEC', weight: 2 },
    { from: 'CE', to: 'LAG', weight: 3 },
    { from: 'LAG', to: 'RU', weight: 2 },
    { from: 'RU', to: 'TEC', weight: 6 },
    { from: 'CCV', to: 'LAG', weight: 2 },
    { from: 'POR', to: 'CCV', weight: 10 },
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
      { name: 'Ate o Centro de Convivencia', input: [NETWORK, 'POR', 'CCV'], expected: 6 },
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
