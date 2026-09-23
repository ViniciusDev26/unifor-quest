# 0028 — Vitest como runner de testes

- Status: aceita
- Data: 2026-09-23
- Resolve: a questão do runner de testes, que estava em aberto

## Contexto

A [ADR 0027](0027-arquitetura-em-aneis.md) colocou o domínio em pacotes puros justamente
para que ele rode sem janela, e a suite de conformance
([ADR 0015](0015-validar-com-typescript-e-java.md)) é, por definição, um conjunto de
testes. O projeto não tinha runner decidido.

## Decisão

**Vitest**, configurado na raiz, rodando os testes de todos os pacotes.

- Configuração em `vitest.config.ts`, com `packages/*/test/**/*.test.ts`.
- `npm test` na raiz roda tudo.
- Os testes ficam em `test/`, fora de `src/`, para que o build de um pacote não os emita
  para `dist/`.

## Consequências

- Vite já estava na stack ([ADR 0001](0001-plataforma-desktop-electron.md)), então TypeScript
  e ESM funcionam sem configuração extra.
- A saída de diferença em estrutura aninhada é legível, o que importa num projeto cujo
  trabalho é comparar JSON profundo — casos de teste, envelopes, grafos.
- Cada pacote ganha um `tsconfig.build.json` para emitir só `src/`, enquanto o
  `tsconfig.json` cobre `src/` e `test/` no typecheck.
- Uma dependência de desenvolvimento a mais na raiz.
- A conformance pode usar o mesmo runner, mas continua precisando rodar contra o **runtime
  podado** ([ADR 0024](0024-runtimes-podados-ao-minimo.md)) — isso é responsabilidade dela,
  não do runner.

## Alternativas descartadas

- **`node:test` nativo**, com o Node 24 executando TypeScript direto: zero dependências, e
  foi uma escolha próxima. Perde na saída de diferença para objetos aninhados, que é
  exatamente o caso de uso dominante aqui.
