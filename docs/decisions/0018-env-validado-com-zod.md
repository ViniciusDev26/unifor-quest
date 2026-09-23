# 0018 — Variáveis de ambiente validadas com Zod num `env.ts`

- Status: aceita
- Data: 2026-09-22

## Contexto

`process.env` é uma das fronteiras da [ADR 0017](0017-type-safety-total.md): o tipo que o
TypeScript dá para ele é `string | undefined` em toda leitura, vindo de um índice que
aceita qualquer chave. Ler direto no ponto de uso espalha essa incerteza pelo código e faz
o erro de uma variável ausente ou malformada aparecer tarde, longe da causa.

Hoje existe uma só variável — `ELECTRON_RENDERER_URL`, injetada pelo electron-vite em
desenvolvimento — mas o padrão precisa estar de pé antes de aparecer a segunda.

## Decisão

**Toda variável de ambiente é declarada e validada num `env.ts`, com Zod.**

- `process.env` é lido num **único lugar por processo**. Hoje:
  `apps/game/src/main/env.ts`.
- Um schema Zod declara cada variável, se é obrigatória ou opcional, e a forma esperada
  (URL, enum, número).
- A validação roda na **inicialização**. Se falhar, o processo aborta na hora, com a lista
  de problemas, em vez de quebrar depois com `undefined`.
- **Nenhum outro módulo lê `process.env`.** O resto do código importa `env`, já tipado.
- Zod é a lib de schema para dado externo **na aplicação**.

O renderer não tem `process.env` ([ADR 0008](0008-quest-engine-no-renderer.md)); se algum
dia precisar de configuração, ela vem do `import.meta.env` do Vite, com o seu próprio
`env.ts` e o mesmo padrão.

## Consequências

- Variável faltando vira erro de inicialização legível, não `undefined` no meio do fluxo.
- O tipo de `env` é derivado do schema, então schema e tipo não podem divergir.
- A falha acontece antes de `app.whenReady()`, então a janela simplesmente não abre. Em
  desenvolvimento o erro aparece no terminal; num app empacotado, vai precisar de um
  diálogo de erro.
- Zod entra como dependência de runtime de `apps/game`, e é externalizada no build do main.
- Esta decisão valia só para a aplicação; a [0019](0019-zod-no-core.md) estendeu Zod a
  `packages/core` e reescreveu a regra de dependência.

## Alternativas descartadas

- **Ler `process.env` no ponto de uso:** é o que havia antes, e espalha
  `string | undefined` por todo lado, com o erro aparecendo longe da causa.
- **Checagem manual (`if (!x) throw`) sem schema:** funciona para uma variável, não tipa
  nada e não escala para formato (URL, enum, número).
