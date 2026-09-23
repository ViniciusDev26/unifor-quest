# 0001 — Plataforma desktop com Electron

- Status: aceita
- Data: 2026-09-22

## Contexto

O jogo precisa executar o código do jogador em linguagens compiladas e interpretadas
(TypeScript, Java, Go). O navegador não dá acesso a compiladores e runtimes locais.

## Decisão

Aplicação desktop em **Electron**, alvo inicial **Windows x64**.

Stack fixada: **TypeScript strict**, **Vite** (bundler do renderer), **Phaser** (jogo 2D),
**Monaco Editor** (editor de código), **Tiled** (mapas), **Node 24 LTS**, **Biome**
(lint e formatação).

Monaco é usado como está; não escrevemos editor próprio.

## Consequências

- Acesso livre ao sistema de arquivos e a processos filhos, que é o que o runner precisa.
- Distribuição vira instalador pesado, e empacotar runtimes de linguagem entra no escopo
  (ver [../open-questions.md](../open-questions.md)).
- Duas fronteiras de processo para manter: renderer e main.
- Monaco é um bundle grande no renderer.

## Alternativas descartadas

- **Jogo web puro:** inviabiliza executar código nativo na máquina do jogador.
