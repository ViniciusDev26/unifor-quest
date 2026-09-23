# Roadmap

O trabalho é dividido em duas fases ([ADR 0029](decisions/0029-fase-a-mecanica-antes-do-conteudo.md)):
primeiro a **mecânica**, depois o **conteúdo**.

## Fase A — a máquina — **concluída**

Sem campus, sem arte, sem história. O objetivo era fechar o ciclo:

```text
Abrir desafio → escrever código → executar → testes → concluir → efeito
```

A regra da ordem é provar o caminho mais arriscado primeiro. O maior risco não é o jogo 2D,
é a abstração multi-linguagem
([ADR 0003](decisions/0003-multi-linguagem-custo-por-adapter.md)).

0. **Scaffold** — concluído. Monorepo, Electron + Vite + Phaser, preload, Biome, Vitest.
1. **`packages/core`** — concluído. O domínio inteiro
   ([ADR 0036](decisions/0036-core-e-o-dominio.md)): contratos (`TypeSpec`, `Challenge`,
   `Quest`, `Graph`, `Effect`, `Progress`, envelope) e as regras de jogo
   (`evaluateSubmission`, `isQuestAvailable`, `completeQuest`, `languagesFor`,
   `validateQuest`), cobertos por testes.
2. **`packages/runner`** — concluído. `Executor` e `LanguageAdapter` como portas em `core`,
   backend local com diretório de trabalho em cache, timeout separado e encerramento da
   árvore de processos.
3. **`packages/lang-typescript`** — concluído. Mapeamento de tipos, stub, harness e o
   prelude `Graph` ([ADR 0054](decisions/0054-prelude-graph-e-contagem.md)).
4. **`packages/conformance`** — concluído. Oito cenários rodados contra os quatro adapters,
   com o toolchain de verdade ([ADR 0055](decisions/0055-suite-de-conformance.md)).
5. **`packages/lang-go`** — concluído, e antecipado para cá
   ([ADR 0040](decisions/0040-go-antes-de-java.md)): a distância que faltava exercitar era
   **compilar**, e nem TypeScript nem Java compilam. Custou um adapter e **uma** extensão
   de contrato ([ADR 0041](decisions/0041-command-com-artefato.md)), sem tocar em quest
   nenhuma.
6. **`packages/lang-java`** — concluído. Roda direto do fonte, sem etapa de compilação
   ([ADR 0023](decisions/0023-java-roda-do-fonte.md)), com JSON próprio no harness
   ([ADR 0048](decisions/0048-json-escrito-a-mao-no-java.md)), com `jdtls` no editor
   ([ADR 0050](decisions/0050-workspace-do-editor-de-java.md)).
7. **`packages/lang-python`** — concluído, fora do MVP original
   ([ADR 0052](decisions/0052-python-como-quarta-linguagem.md)). Custou um adapter e nada
   mais, com Pyright no editor ([ADR 0053](decisions/0053-pyright-em-node.md)).
8. **IPC e Monaco** — concluído. Editor → preload → runner → envelope → volta, com o stub
   vindo do adapter e um buffer de código por linguagem. Go tem servidor de linguagem
   (`gopls`) no Monaco oficial ([ADR 0044](decisions/0044-ponte-lsp-propria.md)).
9. **A quest "hello world"** — concluída. As regras de domínio de `core`
   (disponibilidade, avaliação, conclusão, efeitos) ligadas a um desafio trivial resolvido
   nas quatro linguagens, dentro do app.
10. **O prelude `Graph` e a contagem de operações** — concluído nas quatro linguagens
    ([ADR 0054](decisions/0054-prelude-graph-e-contagem.md)). Um Dijkstra de verdade roda e
    o jogo mostra "nós explorados".

A quest hello world é o teste de integração da fase, não conteúdo de jogo.

### O que a Fase A provou

- **Uma linguagem custa um adapter** ([ADR 0003](decisions/0003-multi-linguagem-custo-por-adapter.md)),
  medido três vezes: Go custou um adapter mais uma extensão de contrato, Java um adapter,
  Python um adapter. Nenhuma quest foi tocada.
- O ciclo fecha de ponta a ponta, com toolchain e servidor de linguagem de verdade em
  quatro linguagens.
- A conformance arbitra entre elas, então divergência entre linguagens vira teste vermelho
  e não surpresa na tela do jogador.

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
