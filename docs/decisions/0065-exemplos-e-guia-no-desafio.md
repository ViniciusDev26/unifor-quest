# 0065 — Exemplos e guia no desafio

- Status: aceita
- Data: 2026-10-22

## Contexto

A quest da portaria (`placas-embaralhadas`) abria o editor só com o diálogo e a assinatura
`decodeSign(text: string, shift: int) -> string`. O jogador não via nenhum par de entrada e
saída antes de executar, nem uma explicação do que é a cifra de César além da fala do
Marcos — e é a primeira quest do jogo.

## Decisão

- **`Challenge` ganha `examples`** ([challenge.ts](../../packages/core/src/value-objects/challenge.ts)):
  pares `input`/`expected`, com o formato de um caso de teste sem o `name`
  (`exampleSchema`). Exemplo **não roda como teste**: ilustra o problema e pode (deve)
  diferir dos `cases`. Padrão: lista vazia.
- **`Challenge` ganha `guide`**, opcional: `about` (o que o problema pede) e `hints` (dicas
  de como resolver), em português — é texto que o jogador lê (ADR 0031).
- **`validateQuest` checa os exemplos** contra a assinatura, igual aos casos: um exemplo
  com o tipo errado ensinaria o contrato errado.
- **No painel da quest**, os exemplos aparecem abaixo da assinatura, como chamada
  (`decodeSign("Fdpsxv", 3) → "Campus"`), e o guia num tooltip no botão "?" ao lado do
  título, aberto por hover ou foco.

## Consequências

- O dado fica na quest (ADR 0014): cada quest nova declara seus exemplos e dicas, sem
  código na cena nem no painel.
- Os dois campos são opcionais; as quests 2–4 continuam válidas sem eles até ganharem os
  seus.
- Os exemplos não são conferidos por execução — `validateQuest` garante o tipo, não que o
  `expected` esteja certo. Quem escreve o conteúdo confere.

## Alternativas descartadas

- **Mostrar os próprios `cases` como exemplos**: entregaria a bateria de testes inteira
  antes da primeira tentativa, e não deixaria escolher exemplos mais didáticos.
