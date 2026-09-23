# 0002 — Monorepo com npm workspaces

- Status: aceita
- Data: 2026-09-22

## Contexto

O projeto se divide em app, contratos, runner, um pacote por linguagem, suite de
conformance e ferramentas de codegen. Esses pedaços evoluem juntos e compartilham tipos.

## Decisão

Monorepo único com **npm workspaces**, globs `apps/*` e `packages/*`.

Pacotes internos são referenciados **pelo nome do pacote com versão `"*"`**
(ex.: `"@unifor-quest/core": "*"`). O npm não suporta o protocolo `workspace:*`.

## Consequências

- Uma instalação e um lockfile para todo o projeto.
- Mudança de contrato em `core` é vista imediatamente por todos os consumidores.
- A versão `"*"` só funciona dentro do workspace; publicar um pacote isolado exigiria
  trocar por uma faixa de versão real.

## Alternativas descartadas

- **pnpm/yarn com `workspace:*`:** sintaxe mais explícita, mas adiciona um gerenciador de
  pacotes a mais ao setup de quem for rodar o projeto.
