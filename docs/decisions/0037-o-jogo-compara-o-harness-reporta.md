# 0037 — O jogo compara; o harness só reporta

- Status: aceita
- Data: 2026-09-23
- Resolve a contradição entre [0006](0006-protocolo-do-harness.md) e [0032](0032-igualdade-e-validacao-de-valor.md)

## Contexto

O envelope da [0006](0006-protocolo-do-harness.md) traz `passed` por caso de teste, ou seja,
o harness compara. A [0032](0032-igualdade-e-validacao-de-valor.md) diz que as regras de
igualdade ficam em `core` e que a decisão é do jogo. As duas não podem valer.

## Decisão

**O harness reporta `actual`; o jogo decide.**

`evaluateSubmission` compara `expected` com `actual` usando `jsonEquals`
([0032](0032-igualdade-e-validacao-de-valor.md)) e ignora qualquer veredito que venha no
envelope.

## Consequências

- **Existe uma implementação de igualdade, não três.** Escrever comparação profunda de JSON
  em TypeScript, Java e Go — com as mesmas regras de ordem, campo a mais e número — seria
  três chances de divergir, e a divergência apareceria como "passou em Java, falhou em Go"
  no mesmo código correto.
- **Os adapters ficam menores.** O harness só serializa o retorno; não precisa saber o que
  torna dois valores iguais. Isso baixa o custo de cada linguagem nova
  ([0003](0003-multi-linguagem-custo-por-adapter.md)).
- Um caso que o harness não reportou conta como falha, o que cobre o processo que morreu no
  meio — todos os testes rodam numa execução só
  ([0006](0006-protocolo-do-harness.md)).
- **O campo `passed` do envelope fica sem leitor.** Remover é o próximo passo natural, mas é
  mudança no contrato da [0006](0006-protocolo-do-harness.md) e está pendente de decisão —
  ver [../open-questions.md](../open-questions.md).

## Alternativas descartadas

- **O harness compara e o jogo confia:** menos dado trafegando e um envelope menor, ao custo
  de três implementações da mesma regra em três linguagens, que é exatamente o que a
  [0032](0032-igualdade-e-validacao-de-valor.md) existe para impedir.
