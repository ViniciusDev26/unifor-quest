# 0014 — Quests declarativas

- Status: aceita
- Data: 2026-09-22

## Contexto

Quest implementada como código dentro das cenas do Phaser espalha a lógica, dificulta ver
a progressão inteira e torna cada quest nova um trabalho de programação.

## Decisão

Cada quest é **dados**, não lógica espalhada pelas cenas. Uma quest define:

- o **NPC**;
- os **pré-requisitos**, por flags;
- os **diálogos**;
- o **desafio** (assinatura tipada, casos de teste, solução de referência);
- o **`onSuccess`**, que recebe o resultado real e altera o mundo
  ([0013](0013-codigo-com-consequencia-no-mundo.md)).

Cada quest tem uma **solução de referência que precisa passar nos próprios testes**.

## Consequências

- Produção de conteúdo fica separada de desenvolvimento de engine.
- A progressão inteira é inspecionável: dá para validar flags e pré-requisitos sem rodar
  o jogo.
- A Quest Engine precisa de um vocabulário fechado de efeitos para o `onSuccess`, e ampliá-lo
  é mudança de engine.
- As soluções de referência viram uma checagem automática do conteúdo.

## Alternativas descartadas

- **Quests como código nas cenas:** flexibilidade total, ao custo de lógica duplicada e
  progressão impossível de auditar.
