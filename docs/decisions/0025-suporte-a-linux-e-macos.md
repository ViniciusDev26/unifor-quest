# 0025 — Linux e macOS como alvos suportados

- Status: aceita
- Data: 2026-09-22
- Amplia: [0001](0001-plataforma-desktop-electron.md)

## Contexto

A [ADR 0001](0001-plataforma-desktop-electron.md) fixou **Windows x64 como alvo inicial**.
O Electron é multiplataforma de saída, e o projeto é desenvolvido em Linux — ou seja, uma
das plataformas já é exercitada todos os dias. O que não é automático é o que a
[ADR 0021](0021-runtimes-empacotados-no-instalador.md) trouxe: runtimes embutidos são
específicos de sistema operacional e arquitetura.

## Decisão

**O jogo suporta Windows, Linux e macOS.** Windows continua sendo o alvo primário.

Cada plataforma tem o seu pacote, com os seus próprios runtimes embutidos.

## Consequências

- **A matriz de build multiplica.** Cada plataforma precisa do seu JDK (via `jlink` com os
  `jmods` do alvo), do seu toolchain de Go e do seu `GOCACHE` pré-aquecido — que é
  indexado por plataforma e arquitetura, então tem que ser gerado **no alvo**
  ([ADR 0022](0022-go-versao-cache-e-cgo.md)).
- **macOS é o caso difícil.** Assinatura e notarização passam a valer para cada binário
  embutido, e o hardened runtime restringe justamente o que o jogo faz: rodar uma JVM e
  executar um binário recém-compilado. Em aberto — ver
  [../open-questions.md](../open-questions.md).
- **Apple Silicon:** um build arm64 separado ou um universal que dobra o peso dos runtimes.
  Em aberto.
- **No Linux, o formato de distribuição importa**: empacotamentos com sandbox restringem
  spawn de processos e escrita de executáveis, que é exatamente o funcionamento do jogo.
  Em aberto.
- A camada de resolução de toolchain do `Executor`
  ([ADR 0021](0021-runtimes-empacotados-no-instalador.md)) passa a resolver também **por
  plataforma**, e o diretório de trabalho ganha um caminho por sistema operacional.
- Encerrar a árvore de processos ([ADR 0009](0009-execucao-no-main-process.md)) tem uma
  implementação por sistema: no Windows não basta matar o pai; em Linux e macOS o caminho
  é grupo de processos.
- Desenvolver em Linux deixa de ser um desvio do alvo e passa a exercitar uma plataforma
  suportada.

## Alternativas descartadas

- **Só Windows:** menos trabalho de empacotamento e assinatura, mas exclui as máquinas em
  que o próprio jogo está sendo desenvolvido, e deixa de fora quem for avaliar o projeto
  em outro sistema.
