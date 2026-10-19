import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Stop 4 — the Bloco de Tecnologia, the final duel against NULL (docs/story.md). The player
 * wins by beating NULL's brute force on the campus network.
 *
 * `NETWORK` is drawn on purpose so that the shortest path by **weight** is not the one with
 * the fewest hops — that is the point of Dijkstra: POR→CC directly costs 10, but the detour
 * through BIB and GIN costs only 6, even with more buildings in between.
 */
const NETWORK = {
  nodes: [
    { id: 'POR', label: 'Portaria' },
    { id: 'BIB', label: 'Biblioteca' },
    { id: 'GIN', label: 'Centro Esportivo' },
    { id: 'CC', label: 'Centro de Convivência' },
    { id: 'AUD', label: 'Auditório' },
    { id: 'TEC', label: 'Bloco de Tecnologia' },
  ],
  edges: [
    { from: 'POR', to: 'CC', weight: 10 },
    { from: 'POR', to: 'BIB', weight: 2 },
    { from: 'BIB', to: 'GIN', weight: 2 },
    { from: 'GIN', to: 'CC', weight: 2 },
    { from: 'CC', to: 'AUD', weight: 2 },
    { from: 'AUD', to: 'TEC', weight: 2 },
  ],
}

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
      { name: 'Ate o Bloco de Tecnologia', input: [NETWORK, 'POR', 'TEC'], expected: 10 },
      { name: 'Ate o Centro de Convivencia', input: [NETWORK, 'POR', 'CC'], expected: 6 },
      { name: 'Vizinho direto', input: [NETWORK, 'POR', 'BIB'], expected: 2 },
      { name: 'Origem e destino iguais', input: [NETWORK, 'POR', 'POR'], expected: 0 },
    ],
    referenceSolutions: {},
  },
  onSuccess: [
    { kind: 'setFlag', flag: 'null-derrotado' },
    { kind: 'setFlag', flag: 'campus-restaurado' },
  ],
})
