# 0019 — Zod no `core`, e a regra de dependência é sobre pacotes do monorepo

- Status: aceita
- Data: 2026-09-22
- Resolve: a questão da validação em runtime no `core`, que estava em aberto

## Contexto

A [ADR 0017](0017-type-safety-total.md) exige que todo dado externo seja validado em
runtime antes de virar um tipo, e os dados externos do projeto — envelope do harness,
casos de teste, arquivo do Tiled, IPC, save — são todos descritos pelos contratos de
`packages/core`. A validação pertence a `core`, junto dos tipos que ela produz.

Só que a regra de dependência escrita no briefing diz que **`core` não depende de nada**,
o que forçaria escrever os validadores à mão. Validador à mão é código repetitivo que
pode divergir do tipo que diz validar — exatamente o furo que a 0017 quer fechar.

A [ADR 0018](0018-env-validado-com-zod.md) já trouxe Zod para a aplicação.

## Decisão

**`packages/core` pode depender de Zod.**

A regra de dependência passa a ser lida como:

- `core` **não depende de outros pacotes do monorepo**;
- adapters dependem só de `core`;
- nenhum pacote importa de `apps/`.

Dependências externas são permitidas onde se pagam. Zod é a lib de schema do projeto, do
`core` à aplicação.

Nos contratos de `core`, **o schema é a fonte e o tipo é inferido dele** (`z.infer`), não
o contrário. Tipo e validação não podem divergir porque são a mesma declaração.

## Consequências

- `TypeSpec`, `Challenge`, `Quest` e o envelope nascem como schemas; os tipos saem de
  `z.infer`.
- Todo consumidor de `core` carrega Zod — incluindo os adapters, que já o usariam para
  validar o envelope que recebem de volta do processo.
- Uma atualização major de Zod passa a ser uma mudança que atravessa o monorepo inteiro.
- **Exceção técnica:** um tipo recursivo não pode sair de `z.infer`, porque o TypeScript
  não infere tipo recursivo a partir do inicializador de um valor. Nesses casos o tipo é
  escrito à mão e o schema é **anotado** com ele, o que mantém os dois amarrados pelo
  compilador. Hoje isso vale só para `TypeSpec`.
- A intenção original da regra continua preservada: o que estava sendo evitado era
  acoplamento entre pacotes nossos, não uso de biblioteca.

## Alternativas descartadas

- **Validadores escritos à mão em `core`:** mantém a letra da regra ao custo de código
  repetitivo, e cria a chance de o validador e o tipo discordarem.
- **Validação fora do `core`, em cada consumidor:** espalha a mesma regra por vários
  lugares, que é como as versões divergem.
