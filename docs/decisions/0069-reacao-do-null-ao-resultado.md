# 0069 — Reação do NULL ao resultado

- Status: aceita
- Data: 2026-11-03

## Contexto

Com o duelo de operações ([0068](0068-duelo-de-operacoes.md)), o confronto tem três
desfechos: a resposta está errada, a resposta está certa mas gasta mais que a força bruta do
NULL, ou a resposta está certa e dentro do orçamento. Hoje o NULL só fala ao oferecer a quest
e ao perder (`dialogue.offer` e `dialogue.success`). Ficou em aberto se ele reage ao
resultado, inclusive à margem (passou raspando, passou folgado), e como essa reação chega à
cena, já que o `Effect` só tem `setFlag` ([0034](0034-vocabulario-de-effect-e-prerequisitos.md),
[open-questions §6](../open-questions.md)).

## Decisão

- **Duas reações, sem medir a margem.**
  - **Certo, mas acima do orçamento:** o NULL debocha com uma fala fixa. A quest ganha
    `dialogue.overBudget`, opcional, uma lista de falas como `offer` e `success`, mostrada no
    painel quando `evaluateSubmission` diz que os testes passaram fora do orçamento.
  - **Venceu:** continua sendo `dialogue.success`. O que acontece no campus depois vem da
    cutscene final ([0066](0066-cutscene-e-dado.md)), com `requires` na quest do confronto.
- **Resposta errada não tem fala do NULL.** É igual a qualquer quest: os testes mostram o
  que falhou.
- **A reação chega como dado da quest, não como `Effect`.** Ela não muda o mundo, só o que
  o painel mostra numa tentativa; `Effect` continua sendo o que acontece na primeira
  conclusão ([0027](0027-arquitetura-em-aneis.md), [0030](0030-qualquer-linguagem-e-replay-livre.md)).
- **`validateQuest` exige `overBudget` quando o desafio tem `opsBudget`**: um duelo sem a
  fala de quando o jogador perde para o NULL é conteúdo esquecido.

A fala está no roteiro ([story.md](../story.md), Bloco de Tecnologia).

## Consequências

- O vocabulário de `Effect` não cresce.
- O painel ganha um terceiro estado de resultado, além de "resolvido" e "falhou": "certo,
  mas o NULL foi mais rápido", com a fala dele.
- Qualquer desafio com orçamento pode ter seu próprio deboche; a quest 4 é a primeira.
- A implementação entra junto com o orçamento, no card "Orçamento de operações do NULL na
  quest 4".

## Alternativas descartadas

- **Reação por margem** (raspando, folgado): mais falas e uma regra para medir a margem,
  num jogo de 20 minutos em que quase ninguém repete o duelo para ver a outra reação.
- **Reação como `Effect` ou flag:** uma fala de tentativa não é estado do mundo, e uma flag
  ficaria marcada depois que o jogador vencesse.
- **Reação também à resposta errada:** confundiria "o código está errado" com "o NULL foi
  mais rápido", que é a distinção que o duelo quer ensinar.
