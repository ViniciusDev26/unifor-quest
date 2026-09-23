# 0021 — Runtimes empacotados no instalador

- Status: aceita
- Data: 2026-09-22
- Resolve: a escolha do backend de execução, que estava em aberto

## Contexto

A [ADR 0009](0009-execucao-no-main-process.md) definiu a interface `Executor` e deixou
deliberadamente em aberto **quem está do outro lado dela**: quem de fato compila e roda o
código do jogador. Havia dois caminhos — runtimes na máquina do jogador, ou um executor
remoto self-hosted como o Piston.

## Decisão

**Backend local, com os runtimes embutidos no instalador.**

- **Sem servidor.** Nada de executor remoto: o jogo não depende de nada estar no ar.
- **Sem instalação pela mão do jogador.** Ele não precisa ter JDK, Go ou Node instalados;
  o jogo traz o que precisa.
- Em **desenvolvimento**, o backend usa os toolchains do ambiente (fixados no
  `mise.toml`). É o mesmo backend, resolvendo os executáveis por outro caminho.
- Em **produção**, os runtimes vêm de dentro do próprio app.

Como consequência direta, o `Executor` precisa de uma camada de **resolução de toolchain**:
em desenvolvimento o executável vem do ambiente, em produção vem do bundle. O resto —
diretório de trabalho, compilação, execução, timeout, encerramento da árvore de processos
— é idêntico nos dois.

## Consequências

- O jogo funciona **offline**, sem latência de rede e sem servidor para manter — que é o
  comportamento certo para um jogo de disciplina, onde o pior momento possível para uma
  indisponibilidade é o dia da apresentação.
- O **instalador fica grande**. O Electron já pesa sozinho, e Java e Go somam na casa das
  centenas de MB. É ordem de grandeza: precisa ser medido, não estimado.
- **TypeScript sai quase de graça**: o Electron já embute o Node, que pode ser
  reexecutado como Node puro (`ELECTRON_RUN_AS_NODE`). O peso real é Java e Go.
- **O Windows Defender inspeciona binário recém-criado**, e cada execução gera um. Isso
  entra direto no tempo de resposta de cada "Executar" e precisa ser levado em conta no
  desenho do diretório de trabalho — ver [../open-questions.md](../open-questions.md).
- **Atualizar um runtime passa a exigir uma nova versão do instalador.**
- Isso **acrescenta uma nuance à [ADR 0003](0003-multi-linguagem-custo-por-adapter.md)**:
  o custo de *desenvolvimento* de uma linguagem continua sendo um adapter, mas o custo de
  *distribuição* passa a incluir empacotar mais um runtime. O requisito da 0003 continua
  valendo para o código; o instalador é outro eixo.
- A [ADR 0010](0010-sem-docker.md) fica reforçada: sem servidor, não há execução de código
  de terceiros, e o modelo de risco continua sendo loop infinito e processo órfão.

## Alternativas descartadas

- **Executor remoto self-hosted (Piston):** instalador pequeno e linguagem nova sem tocar
  no cliente, mas exige container privilegiado, adiciona latência por execução, elimina o
  modo offline e faz o diferencial do jogo depender de um servidor estar de pé.
- **Exigir que o jogador instale os toolchains:** custo zero de empacotamento e barreira
  de entrada intransponível para quem só quer jogar.
