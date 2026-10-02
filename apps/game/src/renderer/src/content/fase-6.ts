import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Fase 6 — o clímax do Ato 3 (Dijkstra, grafos + eficiência, transformação de dados). A
 * corrida até o Centro de Dados, o confronto com o NULL e a migração que o salva
 * (docs/story.md).
 *
 * `ROUTE` é desenhado de propósito para que o caminho mais curto em **peso** não seja o de
 * menos saltos — o ponto do Dijkstra é esse: TEC→AUD direto custa 10, mas o desvio por
 * GIN e CC custa só 6, mesmo com mais prédios no meio.
 */

const ROUTE = {
  nodes: [
    { id: 'TEC', label: 'Bloco de Tecnologia' },
    { id: 'AUD', label: 'Auditório' },
    { id: 'GIN', label: 'Centro Esportivo' },
    { id: 'CC', label: 'Centro de Convivência' },
    { id: 'BIB', label: 'Biblioteca' },
    { id: 'CDD', label: 'Centro de Dados' },
  ],
  edges: [
    { from: 'TEC', to: 'AUD', weight: 10 },
    { from: 'TEC', to: 'GIN', weight: 2 },
    { from: 'GIN', to: 'CC', weight: 2 },
    { from: 'CC', to: 'AUD', weight: 2 },
    { from: 'AUD', to: 'BIB', weight: 2 },
    { from: 'BIB', to: 'CDD', weight: 2 },
  ],
}

export const aCorridaAteOCentroDeDadosQuest: Quest = questSchema.parse({
  id: 'a-corrida-ate-o-centro-de-dados',
  title: 'A corrida até o Centro de Dados',
  npc: 'Lia',
  objective: 'Ache com Lia a rota mais curta até o Centro de Dados',
  requires: { quests: ['loop-na-rede'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Lia',
        text: 'A pé, boa parte do campus está intransitável. Mas a rede ainda mostra as distâncias entre os prédios.',
      },
      {
        speaker: 'Lia',
        text: 'Me dá a rota de menor distância total até o Centro de Dados. É por aí que vamos.',
      },
    ],
    success: [
      {
        speaker: 'Lia',
        text: 'É essa a rota. Vamos — não sabemos quanto tempo o NULL vai nos deixar chegar.',
      },
    ],
  },
  challenge: {
    functionName: 'shortestRoute',
    parameters: [
      { name: 'network', type: { kind: 'graph' } },
      { name: 'start', type: { kind: 'string' } },
      { name: 'end', type: { kind: 'string' } },
    ],
    returns: { kind: 'list', element: { kind: 'string' } },
    cases: [
      {
        name: 'Ate o Centro de Dados',
        input: [ROUTE, 'TEC', 'CDD'],
        expected: ['TEC', 'GIN', 'CC', 'AUD', 'BIB', 'CDD'],
      },
      {
        name: 'Ate o Auditorio',
        input: [ROUTE, 'TEC', 'AUD'],
        expected: ['TEC', 'GIN', 'CC', 'AUD'],
      },
      { name: 'Vizinho direto', input: [ROUTE, 'TEC', 'GIN'], expected: ['TEC', 'GIN'] },
      { name: 'Origem e destino iguais', input: [ROUTE, 'TEC', 'TEC'], expected: ['TEC'] },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'rota-centro-de-dados-encontrada' }],
})

export const oConfrontoQuest: Quest = questSchema.parse({
  id: 'o-confronto',
  title: 'O confronto',
  npc: 'NULL',
  objective: 'Enfrente o NULL com menos operações do que a força bruta dele',
  requires: { quests: ['a-corrida-ate-o-centro-de-dados'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'NULL',
        text: '// entao chegou ate aqui. vamos ver se sua solucao e tao boa quanto a forca bruta que eu tenho de sobra.',
      },
      {
        speaker: 'NULL',
        text: '// me diz a distancia total ate o alvo. eu ja sei a resposta — a questao e se voce chega nela gastando menos que eu.',
      },
    ],
    success: [
      {
        speaker: 'NULL',
        text: '// ...impossivel. nenhuma forca bruta vence isso. quem... quem e voce.',
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
      { name: 'Ate o Centro de Dados', input: [ROUTE, 'TEC', 'CDD'], expected: 10 },
      { name: 'Ate o Auditorio', input: [ROUTE, 'TEC', 'AUD'], expected: 6 },
      { name: 'Vizinho direto', input: [ROUTE, 'TEC', 'GIN'], expected: 2 },
      { name: 'Origem e destino iguais', input: [ROUTE, 'TEC', 'TEC'], expected: 0 },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'null-identidade-revelada' }],
})

export const aMigracaoQuest: Quest = questSchema.parse({
  id: 'a-migracao',
  title: 'A migração',
  npc: 'Lia',
  objective: 'Migre os registros do NULL com Lia, em vez de apagá-los',
  requires: { quests: ['o-confronto'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'Lia',
        text: 'Não precisa apagar. Dá pra migrar os registros dele pro formato novo, e ele continua existindo — só que atualizado.',
      },
      {
        speaker: 'Lia',
        text: 'Cada registro antigo vem como um texto só, "nome:idade:curso". Transforma isso num dado de verdade pra mim.',
      },
    ],
    success: [
      {
        speaker: 'Lia',
        text: 'Pronto. O campus está voltando, prédio por prédio.',
      },
    ],
  },
  challenge: {
    functionName: 'migrateRecords',
    parameters: [{ name: 'legacyRecords', type: { kind: 'list', element: { kind: 'string' } } }],
    returns: {
      kind: 'list',
      element: {
        kind: 'struct',
        name: 'Student',
        fields: [
          { name: 'name', type: { kind: 'string' } },
          { name: 'age', type: { kind: 'int' } },
          { name: 'course', type: { kind: 'string' } },
        ],
      },
    },
    cases: [
      {
        name: 'Dois registros',
        input: [['Ana:21:Computacao', 'Caio:19:Design']],
        expected: [
          { name: 'Ana', age: 21, course: 'Computacao' },
          { name: 'Caio', age: 19, course: 'Design' },
        ],
      },
      {
        name: 'Um registro so',
        input: [['Beatriz:30:Sistemas']],
        expected: [{ name: 'Beatriz', age: 30, course: 'Sistemas' }],
      },
      { name: 'Nenhum registro', input: [[]], expected: [] },
    ],
    referenceSolutions: {},
  },
  onSuccess: [
    { kind: 'setFlag', flag: 'null-salvo' },
    { kind: 'setFlag', flag: 'campus-restaurado' },
  ],
})

export const fase6Quests: readonly Quest[] = [
  aCorridaAteOCentroDeDadosQuest,
  oConfrontoQuest,
  aMigracaoQuest,
]
