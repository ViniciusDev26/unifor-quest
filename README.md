# UNIFOR Quest

Jogo 2D top-down em TypeScript. Monorepo com npm workspaces.

## Requisitos

- Node 24 LTS (ver `mise.toml` / `.nvmrc`)
- npm 10+

## Estrutura

```
apps/game    # aplicacao Electron (main + preload + renderer Vite/Phaser)
packages/    # pacotes internos compartilhados (vazio por enquanto)
```

## Como rodar

```bash
npm install     # na raiz, instala todos os workspaces
npm run dev     # abre a janela do Electron com HMR no renderer
```

Outros scripts (todos na raiz):

```bash
npm run build      # build de producao do app (saida em apps/game/out)
npm run lint       # Biome (lint + format check)
npm run typecheck  # tsc --noEmit em todos os workspaces
```

## Notas

- O renderer sobe uma cena Phaser vazia (`BootScene`) apenas para validar o pipeline.
- O Electron roda com `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`.
  O preload expoe `window.api = {}` via `contextBridge`, pronto para receber funcoes.
- Pacotes internos devem ser referenciados pelo nome com versao `"*"`
  (ex.: `"@unifor-quest/core": "*"`); o npm nao suporta o protocolo `workspace:*`.

## Documentacao

Comece por [CLAUDE.md](CLAUDE.md) e siga para [docs/](docs/): visao, arquitetura,
ADRs (`docs/decisions/`), roadmap e questoes em aberto.
