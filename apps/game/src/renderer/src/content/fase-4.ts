import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * Fase 4 — o Bloco de Tecnologia (árvore, duas vezes). Sem um único NPC vivo lá dentro
 * (docs/story.md): quem "fala" com o jogador é o próprio NULL, em texto glitchado.
 */

const SERVER_TREE = {
  nodes: [
    { id: 'ROOT', label: '/' },
    { id: 'BIN', label: '/bin' },
    { id: 'ETC', label: '/etc' },
    { id: 'LOGS', label: '/bin/logs' },
    { id: 'CORE', label: '/etc/core' },
    { id: 'SECRET', label: '/etc/core/secret' },
  ],
  edges: [
    { from: 'ROOT', to: 'BIN', weight: 1 },
    { from: 'ROOT', to: 'ETC', weight: 1 },
    { from: 'BIN', to: 'LOGS', weight: 1 },
    { from: 'ETC', to: 'CORE', weight: 1 },
    { from: 'CORE', to: 'SECRET', weight: 1 },
  ],
}

export const diretoriosDoServidorQuest: Quest = questSchema.parse({
  id: 'diretorios-do-servidor',
  title: 'Diretórios do servidor',
  npc: 'NULL',
  objective: 'Ache o caminho até o diretório marcado no servidor',
  requires: { quests: ['rastreando-o-null'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'NULL',
        text: '// voce entrou onde nao devia. as portas so abrem pra quem sabe o caminho.',
      },
      {
        speaker: 'NULL',
        text: '// me diz a sequencia de diretorios da raiz ate o alvo. acerte e elas abrem.',
      },
    ],
    success: [
      {
        speaker: 'NULL',
        text: '// ...certo. as portas estao abertas. nao acha que isso vai adiantar.',
      },
    ],
  },
  challenge: {
    functionName: 'pathToDirectory',
    parameters: [
      { name: 'tree', type: { kind: 'graph' } },
      { name: 'target', type: { kind: 'string' } },
    ],
    returns: { kind: 'list', element: { kind: 'string' } },
    cases: [
      {
        name: 'Alvo no fundo',
        input: [SERVER_TREE, 'SECRET'],
        expected: ['ROOT', 'ETC', 'CORE', 'SECRET'],
      },
      { name: 'Alvo raso', input: [SERVER_TREE, 'LOGS'], expected: ['ROOT', 'BIN', 'LOGS'] },
      { name: 'Alvo e a raiz', input: [SERVER_TREE, 'ROOT'], expected: ['ROOT'] },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'portas-servidor-abertas' }],
})

export const niveisDeAcessoQuest: Quest = questSchema.parse({
  id: 'niveis-de-acesso',
  title: 'Níveis de acesso',
  npc: 'NULL',
  objective: 'Descubra o nível de acesso de cada diretório',
  requires: { quests: ['diretorios-do-servidor'], flags: [] },
  dialogue: {
    offer: [
      {
        speaker: 'NULL',
        text: '// quanto mais fundo, mais alto o nivel. prova que entendeu antes de pedir cracha.',
      },
      {
        speaker: 'NULL',
        text: '// me diz quantos saltos da raiz ate o diretorio que eu te dou o nivel certo.',
      },
    ],
    success: [
      {
        speaker: 'NULL',
        text: '// nivel de administrador concedido. nao diga que nao avisei.',
      },
    ],
  },
  challenge: {
    functionName: 'accessLevel',
    parameters: [
      { name: 'tree', type: { kind: 'graph' } },
      { name: 'target', type: { kind: 'string' } },
    ],
    returns: { kind: 'int' },
    cases: [
      { name: 'Nivel maximo', input: [SERVER_TREE, 'SECRET'], expected: 3 },
      { name: 'Nivel intermediario', input: [SERVER_TREE, 'CORE'], expected: 2 },
      { name: 'Nivel raso', input: [SERVER_TREE, 'BIN'], expected: 1 },
      { name: 'A propria raiz', input: [SERVER_TREE, 'ROOT'], expected: 0 },
    ],
    referenceSolutions: {},
  },
  onSuccess: [{ kind: 'setFlag', flag: 'cracha-administrador' }],
})

export const fase4Quests: readonly Quest[] = [diretoriosDoServidorQuest, niveisDeAcessoQuest]
