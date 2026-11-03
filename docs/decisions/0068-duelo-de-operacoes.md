# 0068 — Duelo de operações

- Status: aceita
- Data: 2026-11-03

## Contexto

O confronto final ([story.md](../story.md), quest 4) é um duelo: o jogador vence o NULL
quando a solução dele gasta **menos operações** que a força bruta do NULL. A contagem já
existe: o prelude `Graph` conta cada `neighbors` ([0054](0054-prelude-graph-e-contagem.md)),
o envelope traz `ops` por caso e `evaluateSubmission` soma tudo em `totalOps`. Só que nada
compara esse número com um limite. Hoje qualquer solução correta derrota o NULL, inclusive
a mais lenta, e o duelo não existe no código ([open-questions §6](../open-questions.md)).

Medindo na rede atual da quest (6 nós, quase uma linha), a força bruta não se distingue de
Dijkstra:

| Rede | Dijkstra | Força bruta (todos os caminhos) | Bellman-Ford |
| --- | --- | --- | --- |
| atual, POR→TEC | 5 | 9 | 30 |
| atual, POR→CC | 3 | 3 | 30 |
| grade 4×3 (12 nós) | 11 | 157 | 132 |
| grade 4×4 (16 nós) | 15 | 1087 | 240 |

## Decisão

- **O orçamento é dado do desafio.** `Challenge` ganha `opsBudget`, opcional, inteiro
  positivo: o que a força bruta do NULL gasta. Fica no `Challenge`, não numa regra da
  quest 4, porque é o desafio que `evaluateSubmission` recebe e porque a regra não precisa
  saber do NULL ([0014](0014-quests-declarativas.md)). O NULL é a narrativa por cima de um
  campo genérico.
- **O orçamento faz parte da vitória.** `evaluateSubmission` compara o `totalOps` da
  execução com `opsBudget` e devolve `withinBudget`. `solved` passa a exigir os testes
  passando **e** `withinBudget`. Sem `opsBudget`, `withinBudget` é sempre verdadeiro e nada
  muda nas outras quests.
- **Compara-se o total da execução**, o `totalOps` que já existe, não cada caso. Para isso
  funcionar, o desafio do duelo precisa de um caso grande o bastante para dominar o total.
- **O número é escrito à mão e protegido por teste.** A quest traz uma solução de
  referência e uma força bruta, e um teste confere que
  `referência ≤ opsBudget < força bruta` na rede da quest. Basta TypeScript: quem conta é o
  prelude, com a mesma regra em toda linguagem ([0054](0054-prelude-graph-e-contagem.md)).
- **A rede do duelo precisa separar as duas soluções.** A rede atual não serve (tabela
  acima). A quest 4 ganha uma rede com ramificações, na ordem de 12 a 16 nós, em que a
  força bruta gasta várias vezes o que Dijkstra gasta.
- **Na tela, uma barra do NULL** no painel da quest, só quando o desafio tem `opsBudget`:
  o orçamento do NULL e as operações do jogador lado a lado. Ao vencer, a barra esvazia,
  como no roteiro. Testes passando com o orçamento estourado mostram que a resposta está
  certa, mas o NULL foi mais rápido, e o jogador tenta de novo.

## Consequências

- O duelo vira regra de jogo em `core`, testável em Node, sem cena nem canvas
  ([0027](0027-arquitetura-em-aneis.md)).
- Qualquer desafio futuro pode ter orçamento; a quest 4 é só o primeiro.
- A métrica é a mesma em todas as linguagens, então o duelo é justo em qualquer uma
  ([0030](0030-qualquer-linguagem-e-replay-livre.md)).
- Uma solução que devolve a resposta fixa, sem percorrer o `Graph`, gasta zero operações e
  vence o duelo, como já passa em qualquer teste. O jogo é um ambiente de programação, não
  um juiz contra trapaça ([0046](0046-ambiente-de-programacao-de-verdade.md)).
- O que o NULL **fala** ao vencer ou perder o duelo não é decidido aqui: é a pergunta
  seguinte do [open-questions §6](../open-questions.md).
- A implementação é o card "Orçamento de operações do NULL na quest 4".

## Alternativas descartadas

- **Barra só decorativa, sem afetar a vitória:** mais simples, mas qualquer solução correta
  venceria, e o duelo da história seria só texto.
- **Orçamento por caso:** dá mais controle, mas os casos pequenos (origem igual ao destino)
  não têm o que medir e só criariam limites artificiais.
- **Orçamento calculado na hora, rodando a força bruta:** dispensa escrever o número, mas
  executa código a mais em toda submissão para chegar sempre ao mesmo valor.
- **Efeito ou campo específico da quest 4:** acopla a regra ao NULL e não serve a nenhum
  outro desafio.
