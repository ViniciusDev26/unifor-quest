# 0029 — Fase A (mecânica) antes da Fase B (conteúdo)

- Status: aceita
- Data: 2026-09-23
- Substitui o escopo de MVP de [0016](0016-go-no-mvp.md) e do briefing (§16)

## Contexto

O escopo original era uma fatia vertical: um trecho do campus, três quests — tutorial,
BFS destravando uma porta e Dijkstra com o personagem percorrendo a rota — e as linguagens
suportadas. A ideia era provar o ciclo inteiro cedo.

Duas coisas mudaram. A rota animada saiu: fazer o personagem caminhar por um trajeto que o
jogador já podia percorrer a pé é cutscene, não consequência. E a prioridade passou a ser
**a mecânica e a parte técnica**, deixando história, mapa e arte para depois.

## Decisão

O trabalho é dividido em duas fases.

**Fase A — a máquina.** `core`, `runner`, os três adapters, a conformance, o IPC com o
Monaco e a `engine`. Nenhum conteúdo de jogo: sem campus, sem arte, sem história.

**A Fase A fecha com uma quest "hello world"** — um desafio trivial, resolvido nas três
linguagens, atravessando o ciclo inteiro: abrir o desafio, escrever o código, executar,
passar nos testes, concluir a quest e disparar o efeito.

Essa quest **não é conteúdo de jogo**: é o teste de integração do ciclo. Ela fecha a fase
em vez de abri-la, e pode ser descartada depois — ou virar o tutorial de verdade, se
servir.

**Fase B — o jogo.** Campus no Tiled, quests reais, NPCs, diálogos, arte, história e save.

## Consequências

- A máquina fica pronta antes de qualquer investimento em level design e arte, e é nela que
  mora o risco real do projeto ([ADR 0003](0003-multi-linguagem-custo-por-adapter.md)).
- **O risco desta ordem é construir sistemas que não encaixam no conteúdo**, porque ninguém
  jogou nada até o fim da fase. A quest hello world existe para reduzir isso, e é por esse
  motivo que ela fecha a Fase A em vez de ficar para a Fase B.
- O grafo do campus no Tiled ([0012](0012-grafo-do-campus-no-tiled.md)) e o save
  ([0020](0020-autosave-por-quest.md)) saem do caminho crítico inicial e vão para a Fase B.
- A medição de tamanho do empacotamento também é Fase B — ver
  [../open-questions.md](../open-questions.md).
- O `Graph` continua sendo necessário na Fase A, porque desafios de grafo recebem um grafo
  como entrada. Mas ele pode ser definido pelo que o algoritmo precisa, com a posição dos
  nós opcional, já que o mapa ainda não existe.
- Contraria a fatia vertical do briefing, que é registro histórico; esta ADR passa a valer.

## Alternativas descartadas

- **A fatia vertical original**, com campus e três quests: prova mais de uma vez só, mas
  exige level design, arte e conteúdo antes de a máquina existir — e a máquina é onde está
  a incerteza.
- **Terminar a Fase A sem nenhuma quest:** mais rápido no papel, e a primeira vez que
  alguém jogaria o jogo seria depois de tudo pronto, que é quando o desencaixe custa mais
  caro.
