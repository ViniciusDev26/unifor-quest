# Arquitetura

Este documento separa deliberadamente **o que existe hoje** do **que é planejado**.
Nada na seção "Planejado" está implementado.

---

# Parte 1 — O que existe hoje

Apenas o scaffold. Não há editor, runner, adapters, quests nem conteúdo.

## Árvore real do repositório

```text
unifor-quest/
├─ package.json            # workspaces ["apps/*", "packages/*"], scripts dev/build/lint/typecheck
├─ tsconfig.base.json      # TypeScript strict, herdado pelos workspaces
├─ biome.json              # lint + format na raiz
├─ mise.toml / .nvmrc      # Node 24
├─ packages/               # vazio (.gitkeep)
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

O build gera `apps/game/out/{main,preload,renderer}`.

---

# Parte 2 — Planejado

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

Os esboços de código abaixo são **ilustrativos**, para fixar vocabulário. A forma final é
definida quando `packages/core` for escrito.

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
([ADR 0009](decisions/0009-execucao-no-main-process.md)). O backend concreto ainda está em
aberto — ver [open-questions.md](open-questions.md). A interface existe justamente para que
essa escolha não contamine o resto.

### API do preload

`window.api`, hoje `{}`, cresce para o mínimo necessário — por exemplo `runCode`, `save`,
`load` ([ADR 0008](decisions/0008-quest-engine-no-renderer.md)). Cada função nova é uma
decisão consciente: essa é a única superfície entre jogo e sistema.

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

## Estrutura planejada do monorepo

```text
apps/game/                 # Electron + Phaser + Monaco
packages/core/             # tipos e contratos (TypeSpec, Challenge, Quest, envelope)
packages/runner/           # Executor e implementações
packages/lang-typescript/  # adapter TS            (MVP)
packages/lang-java/        # adapter Java          (MVP, código Java como templates)
packages/lang-go/          # adapter Go            (MVP)
packages/conformance/      # suite que todo adapter precisa passar
content/quests/            # uma pasta por quest: dados + solução de referência
content/maps/              # arquivos Tiled
tools/codegen/             # gera stub/harness por quest × linguagem
```

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
