# 0031 — Código em inglês, documentação e conteúdo em português

- Status: aceita
- Data: 2026-09-23

## Contexto

O projeto é brasileiro, a documentação é em português e o jogo se passa num campus
brasileiro. Sem uma regra explícita, o código vira mistura: identificador em inglês com
comentário em português, ou pior, `concluiuAgora` ao lado de `completedAt`.

## Decisão

**Código em inglês. Documentação e conteúdo do jogo em português.**

Em inglês:

- nomes de variáveis, funções, tipos, arquivos e pacotes;
- comentários;
- descrições de teste;
- mensagens de erro e log voltadas a quem desenvolve;
- metadados de `package.json`.

Em português:

- a documentação do projeto — ADRs, `CLAUDE.md`, `README.md`, `docs/`;
- **o conteúdo do jogo** — diálogos de NPC, títulos de quest, enunciados de desafio e
  qualquer texto que o jogador leia;
- mensagens de erro exibidas ao jogador.
- mensagens de commit, que acompanham a documentação.

A fronteira é simples: **o que o jogador lê é português; o que o programa é, é inglês.**

## Consequências

- O vocabulário do domínio fica em inglês no código — `quest`, `challenge`, `effect`,
  `flag`, `completed` — o que já casa com os termos das ADRs.
- Conteúdo de quest é dado, não código ([ADR 0014](0014-quests-declarativas.md)), então
  diálogos em português vivem nos arquivos de conteúdo e não conflitam com esta regra.
- Um campo pode ter nome em inglês e valor em português: `title: 'O caminho mais curto'`.
  É o esperado.
- Comentários e testes existentes escritos em português foram traduzidos quando esta
  decisão foi tomada.

## Alternativas descartadas

- **Tudo em português, inclusive código:** consistente com a documentação, mas briga com a
  biblioteca padrão de três linguagens, com Zod, Phaser e Electron, e com o vocabulário
  técnico que as próprias ADRs usam.
- **Tudo em inglês, inclusive documentação e diálogos:** o jogo se passa na UNIFOR e é
  jogado em português; traduzir o conteúdo seria trabalho contra o produto.
