# UNIFOR Quest

## O jogo

Aventura de exploração 2D top-down, em pixel art, ambientada no campus da Universidade de
Fortaleza, feita para uma disciplina da faculdade. O jogador controla um estudante que
explora o campus, conversa com NPCs e recebe missões; em várias delas, abre um editor de
código dentro do jogo, escolhe a linguagem, escreve a solução e executa. Passando nos
testes, o **retorno real do código altera o mundo** — a rota que o Dijkstra do jogador
devolve é o caminho que o personagem percorre. Os dois diferenciais são esses: programação
como mecânica de verdade, e suporte a várias linguagens com custo de um adapter por
linguagem, nunca por quest.

## Stack

Electron · TypeScript strict · Vite · Phaser · Monaco Editor (planejado) · Tiled
(planejado) · Node 24 LTS · npm workspaces · Biome.

Plataformas: Windows (primária), Linux e macOS (0025).

## Estado atual (2026-09-22)

Passos 0 e 1 do roadmap concluídos. Não há editor, runner, adapters, quests nem mapas.

O que está de pé:

- monorepo npm workspaces (`apps/*`, `packages/*`), Node 24, Biome, TypeScript strict;
- `apps/game`: Electron + Vite + Phaser, com uma cena Phaser vazia (`BootScene`), preload
  expondo `window.api = {}` e `process.env` validado em `src/main/env.ts`;
- `packages/runner` e os quatro adapters — `lang-typescript`, `lang-go`, `lang-java`,
  `lang-python`. As quatro linguagens resolvem a quest hello world dentro do app.
- `packages/lsp`: ponte JSON-RPC para servidores de linguagem, no Monaco oficial — Go com
  `gopls`, Java com `jdtls`, Python com Pyright. Diagnostics, completação com auto-import, hover, signature
  help, formatação e code actions, com o estado do servidor visível na barra (0044, 0050).
- `packages/core`: **o domínio** (0036). Contratos como schemas Zod — `TypeSpec`,
  `Challenge`, `Quest`, `Effect`, `Graph`, `Progress`, o envelope — e as regras de jogo:
  `evaluateSubmission`, `isQuestAvailable`, `completeQuest`, `applyEffect`, `languagesFor`,
  `validateQuest`, `jsonEquals`, `validateValue`. Coberto por testes em Vitest.

O trabalho está na **Fase A** (mecânica); campus, arte e história são Fase B (0029). Falta
a suite de conformance, o prelude de `Graph` e as marcações do compilador no editor para
quem não tem servidor de linguagem.

## Comandos

Todos na raiz:

```bash
npm install
npm run dev        # abre o Electron com HMR no renderer
npm run build      # build de produção (saída em apps/game/out)
npm run lint       # Biome: lint + format check
npm run typecheck  # tsc --noEmit em todos os workspaces
npm test           # Vitest, testes de todos os pacotes
```

`npx biome check --write .` aplica as correções de formatação.

## Documentação

Leia o que for relevante antes de mexer na arquitetura.

| Documento | Para quê |
| --- | --- |
| [docs/vision.md](docs/vision.md) | Conceito, ciclo principal, progressão, recompensas, direção artística, conceitos de computação. |
| [docs/architecture.md](docs/architecture.md) | O que existe vs. o que é planejado, fluxo de uma execução, contratos, estrutura do monorepo. |
| [docs/decisions/](docs/decisions/README.md) | ADRs numerados, uma decisão por arquivo. O README é o índice. |
| [docs/roadmap.md](docs/roadmap.md) | Escopo do MVP e ordem de construção. |
| [docs/open-questions.md](docs/open-questions.md) | O que ainda não foi decidido. |
| [docs/briefing.md](docs/briefing.md) | Briefing original, registro histórico. Os ADRs têm precedência sobre ele. |

## Decisões que valem para qualquer mudança

Cada uma tem um ADR; o índice está em [docs/decisions/README.md](docs/decisions/README.md).

- Adicionar uma linguagem custa **um adapter**, nunca quests × linguagens (0003).
- Desafio é **dado neutro** + casos em JSON; o código roda nativamente, só dados cruzam a
  fronteira (0004).
- Stub, harness e prelude são **gerados**; arquivos gerados não se editam à mão (0005).
- Um só protocolo de harness, com envelope JSON entre marcadores com nonce, e **todos os
  testes numa execução** (0006).
- Quest Engine no renderer; main expõe API mínima pelo preload (0008).
- Execução no main process, atrás de `Executor`, com timeout e kill da **árvore de
  processos** (0009); backend local, com os runtimes embutidos no instalador — sem
  servidor, sem instalação pelo jogador (0021).
- Complexidade se mede por **contagem de operações**, não por tempo (0011).
- O `onSuccess` da quest recebe o **retorno real** do código do jogador (0013).
- O jogo é um **ambiente de programação de verdade**, não um juiz online: toolchain,
  servidor de linguagem e projeto reais. A função é o contrato com o jogo; o projeto é o
  espaço do jogador (0046, 0047).
- Quest é **dado**, não lógica espalhada pelas cenas (0014). O `onSuccess` é uma **lista
  de efeitos** que a engine emite e as cenas interpretam (0027).
- Save é **automático a cada quest concluída**; não existe save manual (0020).
- Toda quest é resolvível em **qualquer linguagem**, com replay livre; os efeitos são
  aplicados só na primeira conclusão (0030).
- TypeScript e Java definem a abstração, Go a testa; os três estão no MVP (0015, 0016).
- Código **100% type safe**: sem `any`, sem `!`, sem cast de conveniência; dado externo
  entra como `unknown` e só vira tipo depois de validação em runtime (0017).
- Nenhum módulo lê `process.env` direto: toda variável é declarada e validada em
  `env.ts`, com Zod (0018).
- Zod é a lib de schema, do `core` à aplicação. Nos contratos, **o schema é a fonte e o
  tipo sai de `z.infer`** (0019).

## Regras de trabalho

- **Leia os docs relevantes** antes de mudanças arquiteturais.
- **Não reabra decisões registradas em ADRs** sem perguntar antes.
- Quando uma **decisão nova** for tomada: crie o ADR e atualize `CLAUDE.md` e
  `docs/architecture.md` **na mesma mudança**.
- Ao concluir uma etapa do roadmap, **atualize a seção "Estado atual"** deste arquivo.
- **Sem classes.** Estado em closure, funções `createX(...)` devolvendo objetos de funções,
  composição no lugar de herança — inclusive nas cenas do Phaser (0039).
- **Código em inglês** — nomes, comentários, testes, erros de desenvolvedor. Documentação
  e conteúdo do jogo (diálogos, enunciados, texto que o jogador lê) em português (0031).
- Mantenha este arquivo **curto**. Detalhe vai para `docs/`.
- **Nunca** contorne o compilador. Se um tipo estiver no caminho, o tipo está errado ou
  falta validação — o cast não é resposta (0017).
- Não invente decisões: o que não foi decidido vai para
  [docs/open-questions.md](docs/open-questions.md).
- Pacotes internos são referenciados pelo nome com versão `"*"` — o npm não suporta
  `workspace:*`.
- Regras de dependência: `core` não depende de **outros pacotes do monorepo** (libs
  externas, sim); adapters dependem só de `core`; nenhum pacote importa de `apps/` (0019).
- `core` é **o domínio**, e é lá que as regras de jogo moram — não existe `packages/engine`
  (0036).
- **Framework não entra em `packages/`**: Phaser, Electron e Monaco só em `apps/game`.
  O teste é que a engine roda em Node, sem canvas e sem janela (0027).
