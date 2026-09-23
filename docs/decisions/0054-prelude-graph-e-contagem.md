# 0054 — O prelude `Graph` e a contagem de operações

- Status: aceita
- Data: 2026-09-23

## Contexto

Desde o começo o sistema de tipos neutro tinha `graph` e a
[0011](0011-metricas-por-contagem-de-operacoes.md) prometia medir complexidade por
**operações contadas**, não por tempo. Nenhum adapter implementava nenhum dos dois: um
desafio de grafo não compilava em linguagem nenhuma, e todo harness devolvia `ops: 0`.

## Decisão

Cada adapter traz um **prelude** com o `Graph` que o jogador recebe
([0005](0005-adapter-por-linguagem.md)). Ele tem duas funções:

- dar ao jogador algo ergonômico para percorrer — `nodes`, `neighbors`, `label`;
- **contar**: cada chamada a `neighbors` é um nó expandido, e é isso que vira o `ops` do
  envelope.

As arestas do dado são não direcionadas e declaradas uma vez
([0033](0033-forma-do-graph.md)); expandir nos dois sentidos é trabalho do prelude, em cada
linguagem.

O prelude **sempre acompanha uma execução**, mesmo quando o desafio não fala de grafos, para
que o harness conte sem precisar saber. O jogador só o vê no projeto quando é relevante.

Cada linguagem usa o que é idiomático nela: fábrica sobre closure em TypeScript
([0039](0039-sem-classes.md)), struct com métodos em Go, classe em Java e em Python.

## Consequências

- **Desafios de grafo passam a existir.** Um Dijkstra de verdade roda, devolve a rota e o
  jogo mostra "nós explorados" — que era o exemplo do briefing e não funcionava.
- A métrica é comparável entre linguagens porque é a mesma regra nas quatro: quem conta é o
  prelude, não o algoritmo do jogador.
- Um jogador que ignorar o `Graph` e percorrer o dado cru não gera métrica. É o preço de
  medir pela estrutura instrumentada, e está na [0011](0011-metricas-por-contagem-de-operacoes.md).
- O prelude é mais uma coisa que cada linguagem nova precisa trazer, somada ao stub e ao
  harness. O custo por linguagem sobe, mas continua sendo **um adapter**
  ([0003](0003-multi-linguagem-custo-por-adapter.md)).
- Tipos de domínio novos, se vierem, seguem este molde.

## Alternativas descartadas

- **Entregar o grafo como dado cru** (listas e dicionários): nada a implementar, e nenhuma
  métrica — o jogo perderia a comparação entre soluções, que é um dos conceitos que ele
  precisa demonstrar.
- **Contar no harness, em volta da chamada:** contaria execuções, não exploração.
