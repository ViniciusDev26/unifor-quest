# @unifor-quest/core

Contratos e regras puras do domínio. Não depende de nenhum outro pacote do monorepo e nunca
importa framework — nem Phaser, nem Electron, nem Monaco
([ADR 0019](../../docs/decisions/0019-zod-no-core.md),
[ADR 0027](../../docs/decisions/0027-arquitetura-em-aneis.md)).

## Onde cada coisa mora

| Pasta | O que é | Como reconhecer |
| --- | --- | --- |
| `value-objects/` | descritores imutáveis | não tem identidade: dois com o mesmo conteúdo **são** o mesmo |
| `entities/` | coisas com identidade | tem `id`, e outros se referem a ela por ele |
| `rules/` | regras puras do domínio | função sem estado: entra valor, sai resposta |
| `contracts/` | formatos de fronteira | atravessa processo ou disco; **não é domínio** |
| `json.ts` | primitivo compartilhado | o tipo do que pode cruzar a fronteira |

Hoje a única entidade é a `Quest`: ela tem `id`, e outras quests dependem dela por esse id
([ADR 0034](../../docs/decisions/0034-vocabulario-de-effect-e-prerequisitos.md)). Tudo que
pende dela — desafio, casos de teste, diálogo, efeitos — é value object.

O `RunEnvelope` fica em `contracts/` e não em `value-objects/` por um motivo prático: ele é
o formato que o harness imprime no stdout
([ADR 0006](../../docs/decisions/0006-protocolo-do-harness.md)). Mudá-lo quebra todos os
adapters ao mesmo tempo, o que não é verdade para um value object do domínio.

Quando as portas existirem — `Executor`, `LanguageAdapter` — elas ganham uma pasta
`ports/`. Ainda não existem, porque interface sem implementação é interface imaginada.

## Schema e tipo moram juntos

Não há pasta `schemas/`. Pela
[ADR 0019](../../docs/decisions/0019-zod-no-core.md), o schema Zod **é** a fonte e o tipo
sai de `z.infer`: separá-los criaria duas declarações para a mesma coisa, que é exatamente
o que aquela decisão evita. A convenção é `xSchema` para o schema e `X` para o tipo, no
mesmo arquivo.

A única exceção é o `TypeSpec`, que é recursivo: o TypeScript não infere tipo recursivo a
partir do inicializador de um valor, então ali o tipo é escrito à mão e o schema é anotado
com ele.

## Superfície pública

`src/index.ts` exporta tudo de forma plana. A organização acima é interna — quem consome o
pacote importa de `@unifor-quest/core` e não precisa saber em que pasta cada coisa está.
