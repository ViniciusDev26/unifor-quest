# 0035 — Organização de `core` por papel

- Status: aceita
- Data: 2026-09-23

## Contexto

`core` chegou a onze arquivos num diretório plano. Olhando a lista, não dava para dizer o
que era descritor imutável, o que tinha identidade, o que era regra pura e o que era
formato de fronteira — tudo parecia a mesma coisa, e o lugar de um arquivo novo virava
palpite.

## Decisão

O código de `core` é organizado **por papel**, não por assunto:

| Pasta | O que é | Como reconhecer |
| --- | --- | --- |
| `value-objects/` | descritores imutáveis | sem identidade: dois com o mesmo conteúdo são o mesmo |
| `entities/` | coisas com identidade | têm `id`, e outros se referem a elas por ele |
| `rules/` | regras puras | função sem estado |
| `contracts/` | formatos de fronteira | atravessam processo ou disco; não são domínio |
| `json.ts` | primitivo compartilhado | o tipo do que pode cruzar a fronteira |

Os testes espelham a mesma estrutura. A **superfície pública continua plana**: `index.ts`
exporta tudo, e quem consome o pacote não sabe em que pasta cada coisa mora.

**Não existe pasta `schemas/`.** Pela [0019](0019-zod-no-core.md), o schema Zod é a fonte e
o tipo sai de `z.infer`: os dois são a mesma declaração, e separá-los em pastas diferentes
significaria ou duplicar, ou ter um diretório que só reexporta. A convenção é `xSchema` e
`X`, no mesmo arquivo.

## Consequências

- Código novo tem lugar óbvio, e o papel de cada peça fica legível pela árvore.
- `Quest` fica sozinha em `entities/`, e isso é informação: o domínio tem **uma** coisa com
  identidade, e tudo mais pende dela.
- `RunEnvelope` sai do meio do domínio e vai para `contracts/`, o que deixa claro que
  mudá-lo quebra todos os adapters de uma vez.
- Quando `Executor` e `LanguageAdapter` existirem, eles ganham `ports/`
  ([0027](0027-arquitetura-em-aneis.md)).
- O mesmo padrão deve valer para `packages/engine` quando ele existir.
- Mais arquivos pequenos: `Parameter`, `TestCase` e `DialogueLine` saíram de dentro de
  outros arquivos para valer por si.

## Alternativas descartadas

- **Pastas `types/` e `schemas/` separadas**, como pedido originalmente: duas declarações
  para a mesma coisa, contra a [0019](0019-zod-no-core.md).
- **Organizar por assunto** (`quest/`, `challenge/`, `graph/`): agrupa o que já está
  entrelaçado e não responde à pergunta que motivou a mudança, que era distinguir papéis.
- **Manter plano:** funcionava com cinco arquivos, não com onze.
