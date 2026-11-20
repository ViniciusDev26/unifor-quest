# 0081 — O jogo é empacotado com electron-builder

- Status: aceita
- Data: 2026-11-20
- Resolve o empacotador da [questão 1](../open-questions.md) e o card #33

## Contexto

A [0021](0021-runtimes-empacotados-no-instalador.md) decidiu que os runtimes vão dentro do
instalador, e a [0025](0025-suporte-a-linux-e-macos.md) que o jogo roda em Windows, Linux e
macOS. Ficou em aberto a ferramenta que gera os instaladores. As candidatas eram o
electron-builder e o electron-forge. O critério principal é levar pastas grandes (JDK, Go,
Python, Erlang/Elixir e os language servers) para fora do código do app, com uma pasta por
plataforma e arquitetura.

## Decisão

**O electron-builder empacota o jogo**, configurado em `apps/game/electron-builder.yml`.

- **O build continua com o electron-vite.** O electron-builder só recebe o `out/` já pronto.
  Os pacotes do monorepo e as libs do renderer (Phaser, Monaco) já vão embutidos no bundle
  e por isso viraram `devDependencies`. Em `dependencies` ficam só as duas libs que o main
  process carrega de `node_modules`: `zod` e `pyright`.
- **Sem `asar`.** O jogo roda programas Node que moram dentro do app, como o Pyright pelo
  `ELECTRON_RUN_AS_NODE`. Esses processos precisam de um caminho real no disco, e não de um
  caminho dentro de um arquivo compactado.
- **Os runtimes entram como `extraResources`**, de `apps/game/runtimes/<os>-<arch>/` para
  `resources/runtimes/`. O conteúdo dessa pasta fica para o card #34.
- **A versão do Electron é fixa** (`44.4.4`, sem `^`). O electron-builder baixa o binário de
  cada plataforma pela versão exata.
- **O ícone** sai de `scripts/render-icon.py`: o jogador, pixel por pixel, sobre o azul do
  jogo. O PNG fica commitado em `apps/game/build/icon.png`.
- **Os comandos:** `npm run package -- --linux`, `--win`, `--mac --arm64` ou `--mac --x64`,
  na raiz. A saída vai para `apps/game/release/`.
- **`productName` só existe no empacotamento.** O app instalado guarda o save em
  `userData/UNIFOR Quest`. Em desenvolvimento a pasta continua `@unifor-quest/game`, e um
  jogo instalado não sobrescreve o save de quem desenvolve.

## Consequências

- Os três formatos escolhidos saem de uma configuração só: NSIS, dmg e AppImage. Os
  detalhes de cada plataforma ficam para os cards #36 e #37.
- O pacote sem runtimes tem cerca de 380 MB descompactado, quase tudo Electron e os assets
  do jogo. O AppImage compactado tem uns 150 MB. O tamanho não é restrição
  ([0045](0045-tamanho-do-pacote-nao-e-restricao.md)).
- Sem `asar`, quem instala o jogo consegue ler o código do app. Isso não é problema num
  jogo de disciplina com o código aberto.

## Alternativas descartadas

- **electron-forge:** é a ferramenta oficial, mas o AppImage nela depende de um *maker* de
  terceiros. Cada formato pede um *maker*, e copiar pastas grandes por plataforma exige
  hooks. O fluxo de desenvolvimento dele não ajuda aqui, porque o dev já é o electron-vite.
- **`asar` com `asarUnpack` do Pyright:** funciona, mas exige trocar o caminho de
  `app.asar` por `app.asar.unpacked` em cada programa que o jogo executa. Ganha pouco, e o
  ganho é ocultar um código que já é aberto.
