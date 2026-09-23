# Roadmap

O trabalho é dividido em duas fases ([ADR 0029](decisions/0029-fase-a-mecanica-antes-do-conteudo.md)):
primeiro a **mecânica**, depois o **conteúdo**.

## Fase A — a máquina

Sem campus, sem arte, sem história. O objetivo é fechar o ciclo:

```text
Abrir desafio → escrever código → executar → testes → concluir → efeito
```

A regra da ordem é provar o caminho mais arriscado primeiro. O maior risco não é o jogo 2D,
é a abstração multi-linguagem
([ADR 0003](decisions/0003-multi-linguagem-custo-por-adapter.md)).

0. **Scaffold** — concluído. Monorepo, Electron + Vite + Phaser, preload, Biome, Vitest.
1. **`packages/core`** — concluído. `TypeSpec`, `Challenge`, `Quest` com `requires` e
   `onSuccess`, `Effect`, `Graph`, o envelope, `jsonEquals` e `validateValue`, como schemas
   Zod com os tipos saindo de `z.infer`, cobertos por testes.
2. **`packages/runner`** — a interface `Executor` (em `core`, pela
   [ADR 0027](decisions/0027-arquitetura-em-aneis.md)) e o backend local, com timeout
   separado e encerramento da árvore de processos.
3. **`packages/lang-typescript`** — primeiro adapter completo: mapeamento de tipos, stub,
   harness, prelude, diagnostics.
4. **`packages/conformance`** — a suite que define o que é um adapter válido, rodando
   contra o adapter de TypeScript.
5. **`packages/lang-java`** — segundo adapter, o mais distante possível do primeiro. É aqui
   que a abstração é validada de fato, e onde ela quebra se estiver errada.
6. **`packages/lang-go`** — terceiro adapter, o primeiro escrito **contra** a abstração em
   vez de junto com ela. Quanto custar para escrevê-lo é a medição do requisito da
   [ADR 0003](decisions/0003-multi-linguagem-custo-por-adapter.md).
7. **IPC e Monaco** — ligar editor → preload → runner → envelope → volta, dentro do app.
8. **`packages/engine` e a quest "hello world"** — o domínio com estado (quests, flags,
   progressão, efeitos) e um desafio trivial resolvido nas três linguagens, fechando o
   ciclo de ponta a ponta.

A quest hello world é o teste de integração da fase, não conteúdo de jogo.

## Fase B — o jogo

Começa quando a máquina estiver provada:

- campus no Tiled e extração do grafo
  ([ADR 0012](decisions/0012-grafo-do-campus-no-tiled.md));
- quests reais, NPCs, diálogos e progressão;
- arte e identidade visual;
- save e carregamento ([ADR 0020](decisions/0020-autosave-por-quest.md));
- empacotamento e instalador, com a medição de tamanho por plataforma
  ([open-questions.md](open-questions.md)).

## Fora de escopo

Combate, multiplayer, todas as linguagens além das três, sandbox sofisticado.
