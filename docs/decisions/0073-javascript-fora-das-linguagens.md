# 0073 — JavaScript não é linguagem do jogo

- Status: aceita
- Data: 2026-11-03

## Contexto

O [briefing](../briefing.md) listava as linguagens iniciais como TypeScript, JavaScript, Java
e Go. Nenhum adapter de JavaScript foi feito, e a questão ficou em aberto: adapter próprio,
modo do adapter de TypeScript, ou fora da lista ([open-questions](../open-questions.md)).

Hoje o jogo tem cinco linguagens, cada uma com adapter, servidor de linguagem e
conformance: TypeScript, Go, Java, Python ([0052](0052-python-como-quarta-linguagem.md)) e
Elixir ([0056](0056-elixir-como-quinta-linguagem.md)).

## Decisão

**JavaScript sai da lista de linguagens do jogo.** Não há adapter de JavaScript, nem modo
de JavaScript no adapter de TypeScript.

## Consequências

- Quem conhece JavaScript escreve em TypeScript sem aprender nada novo: o adapter roda o
  código no Node, e as anotações de tipo da assinatura são o único acréscimo.
- Não há linguagem a mais para manter na conformance, no empacotamento e no servidor de
  linguagem.
- Adicionar JavaScript depois continua custando um adapter
  ([0003](0003-multi-linguagem-custo-por-adapter.md)), se um dia valer a pena.

## Alternativas descartadas

- **Adapter próprio:** quase todo o trabalho do de TypeScript repetido, para uma linguagem
  que o de TypeScript já cobre.
- **Modo JavaScript no adapter de TypeScript:** o stub e o harness teriam dois sabores, e o
  editor e o servidor de linguagem teriam de alternar, para pouco ganho.
