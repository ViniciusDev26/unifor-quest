# 0008 — Quest Engine no renderer

- Status: aceita
- Data: 2026-09-22

## Contexto

Estado das quests, diálogos e progressão são lógica de jogo, e precisam reagir ao mundo
do Phaser quadro a quadro.

## Decisão

A **Quest Engine fica no renderer**, junto do Phaser.

O **main process expõe uma API mínima** via preload e `contextBridge` — por exemplo
`runCode`, `save`, `load`. Segurança padrão do Electron: **`contextIsolation: true`,
`nodeIntegration: false`**.

## Consequências

- Diálogo, flags e progressão ficam a uma chamada de função do mundo do jogo, sem IPC.
- A superfície de IPC é pequena e explícita, e cada função nova exige uma decisão.
- O renderer **nunca** executa o código do jogador; ver [0009](0009-execucao-no-main-process.md).
- O save é serializado pelo renderer e persistido pelo main.

## Alternativas descartadas

- **Quest Engine no main process:** colocaria uma fronteira de IPC no meio do loop de jogo.
