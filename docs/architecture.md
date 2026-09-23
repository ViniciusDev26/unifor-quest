# Arquitetura

Este documento separa deliberadamente **o que existe hoje** do **que é planejado**.
Nada na seção "Planejado" está implementado.

---

# Parte 1 — O que existe hoje

O scaffold e os contratos de `core`. Não há editor, runner, adapters, quests nem
conteúdo.

## Árvore real do repositório

```text
unifor-quest/
├─ package.json            # workspaces ["apps/*", "packages/*"], scripts dev/build/lint/typecheck
├─ tsconfig.base.json      # TypeScript strict, herdado pelos workspaces
├─ biome.json              # lint + format na raiz
├─ mise.toml / .nvmrc      # Node 24
├─ packages/core/          # contratos e regras puras, organizados por papel (ADR 0035)
│  ├─ src/
│  │  ├─ value-objects/    # type-spec, challenge, parameter, test-case,
│  │  │                    # graph, effect, dialogue-line, language-id
│  │  ├─ entities/         # quest (a unica coisa com identidade)
│  │  ├─ rules/            # json-equals, validate-value
│  │  ├─ contracts/        # run-envelope (formato de fronteira)
│  │  ├─ json.ts           # JsonValue
│  │  └─ index.ts          # superficie publica, plana
│  └─ test/                # Vitest, espelhando a estrutura de src/
└─ apps/game/
   ├─ electron.vite.config.ts
   ├─ tsconfig.json
   └─ src/
      ├─ main/index.ts                      # cria a BrowserWindow
      ├─ main/env.ts                        # process.env validado com Zod
      ├─ preload/index.ts                   # contextBridge.exposeInMainWorld('api', {})
      ├─ preload/index.d.ts                 # tipagem de window.api
      └─ renderer/
         ├─ index.html                      # meta CSP
         └─ src/
            ├─ main.ts                      # instancia o Phaser.Game
            └─ scenes/boot-scene.ts         # cena vazia
```

## Versões em uso

Electron 44, electron-vite 5, Vite 7, Phaser 4, Zod 4, TypeScript 7, Biome 2, Node 24.

> Vite 8 já existe, mas o electron-vite 5 ainda declara peer `vite ^5 || ^6 || ^7`.

## Fronteiras já estabelecidas

```text
main (src/main/index.ts)
  └─ BrowserWindow 1280x720
       webPreferences: contextIsolation: true, nodeIntegration: false, sandbox: true
       dev:  carrega process.env.ELECTRON_RENDERER_URL (servidor Vite, com HMR)
       prod: carrega out/renderer/index.html

preload (src/preload/index.ts)
  └─ contextBridge.exposeInMainWorld('api', {})   # objeto vazio, pronto para receber funções

renderer (src/renderer/)
  └─ Phaser.Game → BootScene (vazia)
```

Verificado em runtime: no renderer, `window.api` é `{}` e `require` é `undefined`.

O build gera `apps/game/out/{main,preload,renderer}` e `packages/core/dist`.

## O que `core` já entrega

Cada contrato é um schema Zod e o tipo sai de `z.infer`
([ADR 0019](decisions/0019-zod-no-core.md)):

| | |
| --- | --- |
| `typeSpecSchema`, `formatTypeSpec` | sistema de tipos neutro e sua notação |
| `challengeSchema`, `questSchema` | desafio e quest como dado, com `requires` e `onSuccess` |
| `effectSchema` | vocabulário fechado de efeitos ([ADR 0034](decisions/0034-vocabulario-de-effect-e-prerequisitos.md)) |
| `graphSchema` | o grafo, com validação de coerência ([ADR 0033](decisions/0033-forma-do-graph.md)) |
| `runEnvelopeSchema` | o envelope do harness |
| `jsonEquals` | igualdade de resultados ([ADR 0032](decisions/0032-igualdade-e-validacao-de-valor.md)) |
| `validateValue` | valor × `TypeSpec`, com caminho nos problemas |
| `evaluateSubmission` | se o jogador resolveu o desafio ([ADR 0037](decisions/0037-o-jogo-compara-o-harness-reporta.md)) |
| `isQuestAvailable`, `availableQuests` | quais quests aparecem, dado o progresso |
| `completeQuest`, `applyEffect` | conclusão, efeitos e primeira vez ([ADR 0030](decisions/0030-qualquer-linguagem-e-replay-livre.md)) |
| `languagesFor` | em que linguagens o desafio pode ser resolvido |
| `validateQuest` | se os casos batem com a assinatura declarada |
| `progressSchema` | o estado do jogador: quests concluídas e flags |

Cobertos por testes em `packages/core/test`.

O que **não** está em `core` e é intencional: `Executor` e `LanguageAdapter`. Eles são
portas e moram aqui pela [ADR 0027](decisions/0027-arquitetura-em-aneis.md), mas nascem
junto da primeira implementação, para não serem interface imaginada.

---

# Parte 2 — Planejado

## Os quatro anéis

A dependência aponta sempre para dentro ([ADR 0027](decisions/0027-arquitetura-em-aneis.md)):

```text
apps/game               Electron, Phaser, Monaco, preload      cascas
  packages/runner, lang-*, conformance                         adaptadores
    portas: Executor, LanguageAdapter, …                       (interfaces, em core)
      packages/core                                            o dominio
```

`core` é o domínio: contratos, entidades, value objects **e as regras de jogo**
([ADR 0036](decisions/0036-core-e-o-dominio.md)). Não existe um pacote `engine` separado.

Portas são interfaces e moram em `core`; as implementações moram fora. **Phaser, Electron e
Monaco existem só em `apps/game`** — o teste é que a engine roda inteira em Node, sem
canvas e sem janela. A engine decide *o que acontece*; o Phaser decide *como aparece*.

## Visão geral

```text
Electron
│
├── Renderer
│   ├── Phaser
│   │   ├── Mundo, mapas (Tiled), player, NPCs, interações
│   │   └── Quest Engine (estado, diálogos, progressão)
│   │
│   └── Monaco Editor
│
├── Preload (contextBridge)
│   └── API mínima: runCode, save, load
│
└── Main Process
    └── Code Runner
        └── Executor + adapters por linguagem
```

A Quest Engine fica no renderer porque é lógica de jogo
([ADR 0008](decisions/0008-quest-engine-no-renderer.md)). O main só expõe o necessário:
executar código e persistir o save. **O renderer nunca executa o código do jogador**
([ADR 0009](decisions/0009-execucao-no-main-process.md)).

## Fluxo de uma execução de código

```text
Jogador escreve código no Monaco
        ↓
IPC (preload: window.api.runCode)
        ↓
Code Runner (main process)
        ↓
Adapter da linguagem gera stub/harness/prelude          [ADR 0005]
        ↓
Executor: diretório temporário → compila (se preciso)
          → roda TODOS os testes numa execução          [ADR 0006, 0009]
          → timeout separado p/ compilação e execução
          → mata a árvore de processos se estourar
        ↓
Envelope JSON entre marcadores com nonce                [ADR 0006]
        ↓
IPC
        ↓
Quest Engine: missão concluída ou falhou
        ↓
onSuccess recebe o retorno real → o mundo muda          [ADR 0013]
```

## Contratos principais

Esta seção descreve o conjunto completo. `TypeSpec`, `Challenge`, `Quest` e o envelope já
existem em `packages/core`; `LanguageAdapter` e `Executor` ainda são esboço.

Em `core`, cada contrato nasce como **schema Zod**, e o tipo sai de `z.infer`: validação e
tipo são a mesma declaração ([ADR 0019](decisions/0019-zod-no-core.md)).

### Sistema de tipos neutro (`TypeSpec`)

Um desafio descreve sua assinatura sem citar linguagem nenhuma
([ADR 0004](decisions/0004-testes-como-dados.md)):

```text
int · float · bool · string
list<T> · map<K,V> · nullable<T>
structs simples
tipos de domínio: Graph
```

Ampliar esse conjunto obriga a mexer em **todos** os adapters — é mudança de contrato.

### `Challenge`

- nome da função;
- parâmetros e retorno, em `TypeSpec`;
- casos de teste em JSON: `name`, `input`, `expected`;
- `customTests: true`, opcional, como válvula de escape
  ([ADR 0007](decisions/0007-valvula-de-escape-custom-tests.md)).

```text
shortestPath(graph: Graph, start: string, destination: string) → nullable<list<string>>
```

### `Quest`

Dados, não lógica nas cenas ([ADR 0014](decisions/0014-quests-declarativas.md)):

- NPC;
- pré-requisitos, por flags;
- diálogos;
- desafio (assinatura tipada, casos de teste, solução de referência);
- `onSuccess`, que recebe o **resultado real** e altera o mundo.

Toda quest tem uma solução de referência que precisa passar nos próprios testes.

### Envelope do harness

Único formato que o jogo interpreta, igual para toda linguagem
([ADR 0006](decisions/0006-protocolo-do-harness.md)):

```json
{
  "results": [{ "name": "...", "passed": true, "actual": [], "ms": 3, "ops": 18 }],
  "playerStdout": "...",
  "error": null
}
```

- delimitado por marcadores com **nonce**, para o `print` do jogador não falsificar o
  resultado;
- `ops` vem das estruturas instrumentadas do prelude
  ([ADR 0011](decisions/0011-metricas-por-contagem-de-operacoes.md));
- `ms` é informação, não métrica de complexidade.

### `LanguageAdapter`

Um por linguagem ([ADR 0005](decisions/0005-adapter-por-linguagem.md)):

- mapeia `TypeSpec` para os tipos da linguagem;
- gera o **stub** exibido no editor;
- gera o **harness** que roda os testes;
- fornece o **prelude** (ex.: `Graph` instrumentado);
- converte erros do compilador em **diagnostics** para o Monaco.

Arquivos gerados nunca são editados à mão. O código do jogador fica em arquivo próprio,
para os números de linha baterem com os do editor.

### `Executor`

Interface no main process, com timeout e encerramento de árvore de processos
([ADR 0009](decisions/0009-execucao-no-main-process.md)). O backend é local, com os
runtimes embutidos no instalador ([ADR 0021](decisions/0021-runtimes-empacotados-no-instalador.md)),
o que dá à interface uma responsabilidade a mais: **resolver o toolchain** — em
desenvolvimento vindo do ambiente, em produção de dentro do app, e em três plataformas
([ADR 0025](decisions/0025-suporte-a-linux-e-macos.md)).

Cada linguagem traz as suas restrições de execução. Go roda com `CGO_ENABLED=0` e um
`GOCACHE` pré-aquecido, que precisa de destino gravável
([ADR 0022](decisions/0022-go-versao-cache-e-cgo.md)). Java roda direto do fonte, sem
etapa de compilação e com um timeout só
([ADR 0023](decisions/0023-java-roda-do-fonte.md)).

### API do preload

`window.api`, hoje `{}`, cresce para o mínimo necessário — por exemplo `runCode`, `save`,
`load` ([ADR 0008](decisions/0008-quest-engine-no-renderer.md)). Cada função nova é uma
decisão consciente: essa é a única superfície entre jogo e sistema.

### `Effect`

O `onSuccess` de uma quest não é callback: é uma **lista de efeitos declarativos** que a
engine emite e as cenas interpretam — `destravarPorta`, `percorrerRota`, `setarFlag`
([ADR 0027](decisions/0027-arquitetura-em-aneis.md)). O vocabulário fechado que a
[ADR 0014](decisions/0014-quests-declarativas.md) exigia é o tipo `Effect`, em `core`.
Ampliá-lo é mudança de engine. O conteúdo do vocabulário ainda não foi definido.

`save` é chamado pela Quest Engine a cada quest concluída, depois de aplicar o
`onSuccess` — não há save manual ([ADR 0020](decisions/0020-autosave-por-quest.md)). A
escrita no disco precisa ser atômica, e o `load` valida o conteúdo antes de confiar nele.

### Type safety nas fronteiras

Nada entra no programa já tipado ([ADR 0017](decisions/0017-type-safety-total.md)). Cada
fronteira abaixo recebe `unknown` e precisa de validação em runtime que possa falhar:

| Fronteira | Origem do dado |
| --- | --- |
| Envelope do harness | stdout de um processo externo |
| Casos de teste | JSON em `content/quests/` |
| Grafo do campus | arquivo do Tiled |
| IPC | `window.api`, renderer ↔ main |
| Save | disco |
| Variáveis de ambiente | `process.env`, validado em `apps/game/src/main/env.ts` |

No sentido inverso, o mapeamento `TypeSpec` → tipos da linguagem alvo tem que ser total e
explícito, sem escape genérico (`Object`, `interface{}`, `any`). Isso é item de
conformance.

### Onde o jogo escreve

Duas naturezas, dois lugares ([ADR 0026](decisions/0026-diretorio-de-trabalho-e-save.md)):

| | Save — persiste | Trabalho — regenerável |
| --- | --- | --- |
| Windows | `%APPDATA%\UNIFOR Quest` | `%LOCALAPPDATA%\UNIFOR Quest\run` |
| macOS | `~/Library/Application Support/UNIFOR Quest` | `~/Library/Caches/<bundle-id>/run` |
| Linux | `~/.config/UNIFOR Quest` | `~/.cache/unifor-quest/run` |

O diretório de trabalho guarda fontes gerados, binários e o `GOCACHE` semeado a partir do
bundle. Ele pode ser apagado pelo sistema a qualquer momento, então o `Executor` trata
cache ausente como estado normal e re-semeia.

## Estrutura do monorepo

```text
apps/game/                 # Electron + Phaser + Monaco                      pronto
packages/core/             # o dominio: contratos, entidades e regras        pronto
packages/runner/           # Executor local, timeouts, arvore de processos   pronto
packages/lsp/              # ponte JSON-RPC para servidores de linguagem     pronto
packages/lang-typescript/  # adapter TS                                      pronto
packages/lang-go/          # adapter Go       (templates/*.go)               pronto
packages/lang-java/        # adapter Java     (templates/*.java)             pronto
packages/lang-python/      # adapter Python   (templates/*.py)               pronto
packages/lang-elixir/      # adapter Elixir   (templates/*.ex, *.exs)        pronto
packages/conformance/      # o que todo adapter precisa passar               pronto
content/quests/            # uma pasta por quest: dados + solucao            Fase B
content/maps/              # arquivos Tiled                                  Fase B
tools/codegen/             # gera stub/harness por quest x linguagem         Fase B
```

Cada adapter de linguagem traz três coisas geradas ([ADR 0005](decisions/0005-adapter-por-linguagem.md)):
o **stub** que o jogador vê, o **harness** que roda os casos, e o **prelude** com o `Graph`
instrumentado que conta os nós explorados
([ADR 0054](decisions/0054-prelude-graph-e-contagem.md)). Harness e prelude são arquivos
reais da linguagem alvo, conferidos pelo compilador dela a cada build
([ADR 0042](decisions/0042-templates-como-arquivos-da-linguagem.md)).

### Regras de dependência

- `core` **não depende de outros pacotes do monorepo** — bibliotecas externas são
  permitidas ([ADR 0019](decisions/0019-zod-no-core.md));
- adapters dependem **só de `core`**;
- **nenhum pacote importa de `apps/`**.

Pacotes internos são referenciados pelo nome com versão `"*"`
([ADR 0002](decisions/0002-monorepo-npm-workspaces.md)).

Os três adapters são escopo do MVP, nesta ordem: TypeScript e Java definem a abstração,
Go a testa ([ADR 0015](decisions/0015-validar-com-typescript-e-java.md),
[ADR 0016](decisions/0016-go-no-mvp.md)).

> `content/` e `tools/` não estão no campo `workspaces` atual (`apps/*`, `packages/*`).
> Se forem virar workspaces, o campo precisa ser estendido.

## Pipeline de conteúdo

O grafo do campus é desenhado no Tiled, numa object layer, e o mesmo dado alimenta mapa,
desafios de grafo e animação da rota ([ADR 0012](decisions/0012-grafo-do-campus-no-tiled.md)).
Uma etapa de extração e validação transforma o arquivo do Tiled no `Graph` que chega aos
desafios.
