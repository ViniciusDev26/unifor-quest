# 0003 — Multi-linguagem é o diferencial, e custa um adapter

- Status: aceita
- Data: 2026-09-22

## Contexto

Poder resolver o mesmo desafio em várias linguagens é um dos dois diferenciais do jogo
(o outro é o código alterar o mundo). A forma ingênua de suportar N linguagens faz o
custo crescer com o número de quests.

## Decisão

Requisito de arquitetura, acima de qualquer implementação:

> O custo de adicionar uma linguagem deve ser proporcional a **um adapter**, nunca ao
> número de quests.

Toda proposta que faça o custo crescer com quests × linguagens é rejeitada por esta
decisão.

## Consequências

- Quests não podem conter nada específico de linguagem; ver [0004](0004-testes-como-dados.md).
- Stub, harness e prelude são gerados, nunca escritos por quest; ver
  [0005](0005-adapter-por-linguagem.md).
- Exceções precisam ser explícitas e raras; ver [0007](0007-valvula-de-escape-custom-tests.md).
- Toda linguagem nova precisa passar na conformance; ver
  [0015](0015-validar-com-typescript-e-java.md).

## Alternativas descartadas

- **Suportar uma linguagem só:** mata o diferencial do projeto.
