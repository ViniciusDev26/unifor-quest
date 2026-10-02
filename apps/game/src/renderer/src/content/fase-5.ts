import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Fase 5 — início do Ato 3 (BFS, DFS), logo depois da confissão de Heitor. "O jogo muda de
 * registro" (docs/story.md): BFS mapeia a infecção se espalhando, DFS corta o ciclo que
 * prendia as câmeras.
 */

const NETWORK = {
  nodes: [
    { id: 'TEC', label: 'Bloco de Tecnologia' },
    { id: 'AUD', label: 'Auditório' },
    { id: 'BIB', label: 'Biblioteca' },
    { id: 'CC', label: 'Centro de Convivência' },
    { id: 'GIN', label: 'Centro Esportivo' },
    { id: 'CDD', label: 'Centro de Dados' },
  ],
  edges: [
    { from: 'TEC', to: 'AUD', weight: 1 },
    { from: 'AUD', to: 'BIB', weight: 1 },
    { from: 'AUD', to: 'CC', weight: 1 },
    { from: 'CC', to: 'GIN', weight: 1 },
    { from: 'GIN', to: 'TEC', weight: 1 },
    { from: 'BIB', to: 'CDD', weight: 1 },
  ],
}

/** A mesma rede, sem o elo que fecha o ciclo (`GIN`–`TEC`) — uma árvore, para contraste. */
const NETWORK_NO_CYCLE = {
  nodes: NETWORK.nodes,
  edges: NETWORK.edges.filter((edge) => !(edge.from === 'GIN' && edge.to === 'TEC')),
}

export const mapaDaInfeccaoQuest: Quest = questSchema.parse({
  id: 'mapa-da-infeccao',
  title: 'Mapa da infecção',
  npc: 'Prof. Heitor',
  objective: 'Mapeie com o Prof. Heitor até onde a infecção já chegou',
  requires: { quests: ['niveis-de-acesso'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Prof. Heitor',
        text: 'Eu devia ter contado isso há muito tempo. Mas agora precisamos conter o que eu deixei escapar.',
      },
      {
        speaker: 'Prof. Heitor',
        text: 'A partir do Bloco de Tecnologia, me diga quais prédios já estão alcançados, até um certo número de saltos pela rede.',
      },
    ],
    success: [
      {
        speaker: 'Prof. Heitor',
        text: 'Agora sabemos exatamente onde ela chegou. Dá pra agir antes que avance mais.',
      },
    ],
  },
  challenge: {
    functionName: 'infectedBuildings',
    parameters: [
      { name: 'network', type: { kind: 'graph' } },
      { name: 'start', type: { kind: 'string' } },
      { name: 'maxHops', type: { kind: 'int' } },
    ],
    returns: { kind: 'list', element: { kind: 'string' } },
    cases: [
      { name: 'Paciente zero so', input: [NETWORK, 'TEC', 0], expected: ['TEC'] },
      { name: 'Um salto', input: [NETWORK, 'TEC', 1], expected: ['TEC', 'AUD', 'GIN'] },
      {
        name: 'Dois saltos',
        input: [NETWORK, 'TEC', 2],
        expected: ['TEC', 'AUD', 'GIN', 'BIB', 'CC'],
      },
      {
        name: 'A partir de outro predio',
        input: [NETWORK, 'BIB', 1],
        expected: ['BIB', 'AUD', 'CDD'],
      },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'mapa-infeccao-revelado' }],
})

export const loopNaRedeQuest: Quest = questSchema.parse({
  id: 'loop-na-rede',
  title: 'Loop na rede',
  npc: 'Prof. Heitor',
  objective: 'Ache o ciclo de roteamento que prende as câmeras',
  requires: { quests: ['mapa-da-infeccao'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Prof. Heitor',
        text: 'As câmeras de segurança pararam de responder. Suspeito de um ciclo de roteamento travando os pacotes.',
      },
      {
        speaker: 'Prof. Heitor',
        text: 'Me diga se essa topologia de rede tem algum ciclo. Se tiver, sei onde cortar.',
      },
    ],
    success: [
      {
        speaker: 'Prof. Heitor',
        text: 'Era isso. Cortei o elo e as câmeras já respondem de novo.',
      },
    ],
  },
  challenge: {
    functionName: 'hasCycle',
    parameters: [{ name: 'network', type: { kind: 'graph' } }],
    returns: { kind: 'bool' },
    cases: [
      { name: 'Rede com ciclo', input: [NETWORK], expected: true },
      { name: 'Rede sem ciclo', input: [NETWORK_NO_CYCLE], expected: false },
      {
        name: 'Rede de um so predio',
        input: [{ nodes: [{ id: 'X', label: 'X' }], edges: [] }],
        expected: false,
      },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'cameras-restauradas' }],
})

export const fase5Quests: readonly Quest[] = [mapaDaInfeccaoQuest, loopNaRedeQuest]
