# 0038 — O envelope não carrega `passed`

- Status: aceita
- Data: 2026-09-23
- Altera: [0006](0006-protocolo-do-harness.md)

## Contexto

A [0037](0037-o-jogo-compara-o-harness-reporta.md) decidiu que o jogo compara e o harness
só reporta. Com isso, o `passed` que o envelope carregava por caso de teste
([0006](0006-protocolo-do-harness.md)) ficou sem leitor, e a pergunta "remover ou manter
como diagnóstico?" estava em aberto.

Escrever o primeiro harness respondeu a pergunta: **o harness não tem como preencher esse
campo.** Como ele não precisa comparar nada, ele também não recebe `expected` — o que entra
no stdin é `{ name, input }` por caso. Um `passed` ali seria sempre um valor inventado.

## Decisão

O `TestResult` do envelope passa a ser `{ name, actual, ms, ops }`. **Sem `passed`.**

O que o harness recebe pelo stdin é apenas `{ name, input }` por caso.

## Consequências

- O harness de cada linguagem fica menor, e some a possibilidade de ele mentir.
- O jogo **não envia o gabarito para o processo do jogador**. Não era um objetivo, mas é um
  efeito bom: o `expected` não fica no diretório de trabalho.
- É mudança no protocolo da [0006](0006-protocolo-do-harness.md), e como nenhum adapter
  existia ainda, o custo foi zero.
- A leitura do envelope fica em `core/contracts/envelope-protocol.ts`, junto dos marcadores
  com nonce, para que runner e adapters não repitam o mesmo parser.

## Alternativas descartadas

- **Manter `passed` como diagnóstico:** um campo que ninguém lê e que o harness não tem
  como calcular honestamente.
- **Enviar `expected` ao harness só para ele preencher o campo:** devolveria a comparação
  para dentro de cada linguagem, que é o que a [0037](0037-o-jogo-compara-o-harness-reporta.md)
  acabou de tirar de lá.
