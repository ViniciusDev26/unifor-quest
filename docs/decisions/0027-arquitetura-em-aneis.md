# 0027 — Arquitetura: núcleo puro, portas e adaptadores, engine separada do core

- Status: aceita
- Data: 2026-09-23

## Contexto

As decisões anteriores fixaram fronteiras de processo ([0008](0008-quest-engine-no-renderer.md),
[0009](0009-execucao-no-main-process.md)), contratos ([0004](0004-testes-como-dados.md))
e execução ([0021](0021-runtimes-empacotados-no-instalador.md)), mas não a **organização
interna** do código. Sem um critério explícito, a lógica de jogo escorre para dentro das
cenas do Phaser — exatamente o que a [0014](0014-quests-declarativas.md) quer evitar — e a
regra de dependência vira intenção, não verificação.

## Decisão

### Quatro anéis, dependência sempre apontando para dentro

```text
apps/game               Electron, Phaser, Monaco, preload      cascas
  packages/runner, lang-*, conformance                         adaptadores
    portas: Executor, LanguageAdapter, …                       (interfaces, em core)
      packages/core                                            núcleo
      packages/engine                                          domínio com estado
```

- **`core`** — contratos **e regras puras, sem estado**: `TypeSpec`, `Challenge`, `Quest`,
  o envelope, o tipo `Effect`, igualdade de resultados, validação de valor. Zero I/O.
- **`engine`** — o domínio **com estado**: quests disponíveis, flags, progressão, o que
  acontece quando um envelope chega, quais efeitos emitir. Depende de `core`.
- **Portas são interfaces e moram em `core`**; as implementações moram fora.
- **`apps/game` só traduz**, nos dois sentidos: input vira evento da engine, efeito vira
  animação.

### Framework não entra em `packages/`

Phaser, Electron e Monaco existem só em `apps/game`. O teste é mecânico, não de bom senso:
**a engine roda inteira em Node, sem canvas e sem janela.** Se testar uma progressão exige
abrir uma janela, o anel já foi furado.

### A engine emite efeitos; o Phaser interpreta

A engine recebe eventos (`falou com o NPC`, `chegou este envelope`) e devolve **efeitos
declarativos** (`destravarPorta`, `percorrerRota`, `setarFlag`). Com isso, o `onSuccess` da
[0013](0013-codigo-com-consequencia-no-mundo.md) **não é callback: é uma lista de efeitos**,
e o "vocabulário fechado de efeitos" que a [0014](0014-quests-declarativas.md) exigia passa
a ser, literalmente, o tipo `Effect` em `core`.

O limite entre os dois: **a engine decide o que acontece, o Phaser decide como aparece.**
A engine diz "percorra `[BIB, RU, CE]`"; duração da animação, câmera e sprite são do Phaser.

### Estado do jogo

Uma store única no renderer — flags e progressão — mutada apenas pelo resultado da engine.
Estado de jogo não vive como campo de cena: cena é apresentação.

### O que não adotamos

Container de injeção de dependência, camada de serviços genérica, repositório genérico
para tudo, CQRS, e a estratificação completa de casos de uso e presenters da Clean
Architecture. O motivo está nas alternativas descartadas.

## Consequências

- A estrutura planejada ganha **`packages/engine`**, que não existia nos documentos.
- **Os adapters de linguagem deixam de arrastar gameplay**: `lang-java` depende de `core`,
  que não sabe o que é progressão.
- O `onSuccess` fica desenhado. Falta só o conteúdo do vocabulário, que é decisão pequena e
  pode esperar a primeira quest.
- O autosave da [0020](0020-autosave-por-quest.md) ganha um gancho óbvio: o efeito de
  conclusão passa pela engine.
- A engine ser testável sem janela **só vale se houver como testá-la** — e o projeto ainda
  não tem runner de testes decidido. Ver [../open-questions.md](../open-questions.md).
- Custo real: um pacote a mais e uma camada de tradução explícita nas cenas. É boilerplate,
  e é o preço de a lógica não morar no Phaser.

## Alternativas descartadas

- **A engine dentro de `apps/game`, framework-free por disciplina:** funciona enquanto a
  disciplina durar. Como pacote, ela **não consegue** importar Phaser — a regra passa a ser
  mecânica.
- **Tudo dentro de `core`, sem `engine`:** um pacote a menos, ao custo de os adapters de
  linguagem dependerem de lógica de quest.
- **Clean Architecture completa**, com camada de casos de uso, DTOs em cada fronteira,
  presenters e container de DI: adotamos o coração dela — a regra de dependência e o
  domínio independente de framework — e deixamos a cerimônia. Um jogo tem **um** fluxo
  central sobre um estado coeso, não dezenas de fluxos independentes; quebrá-lo em classes
  de caso de uso cria objetos que precisam compartilhar o mesmo estado. Os DTOs de
  fronteira que importam já existem, e são schemas Zod validados nas fronteiras reais —
  processo, IPC e disco ([0017](0017-type-safety-total.md)); um DTO a mais entre engine e
  cena, no mesmo processo e na mesma linguagem, seria cópia sem ganho. Presenters se pagam
  com mais de uma UI, e há uma. DI container resolve grafos grandes de dependência, e as
  nossas implementações são conhecidas em tempo de compilação.
