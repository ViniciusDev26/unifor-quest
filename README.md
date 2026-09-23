# UNIFOR Quest

Jogo 2D top-down em TypeScript, ambientado no campus da Universidade de Fortaleza. Em
determinadas missões o jogador abre um editor de código dentro do jogo, escolhe a
linguagem, escreve a solução e executa — e o resultado altera o mundo.

Monorepo com npm workspaces.

## Requisitos

Estes são requisitos **de desenvolvimento**. O jogador não instala nada: no app empacotado
os runtimes vão embutidos ([ADR 0021](docs/decisions/0021-runtimes-empacotados-no-instalador.md)),
e esse empacotamento ainda não foi feito — é Fase B
([roadmap](docs/roadmap.md)).

- **Node 24 LTS** — fixado em `mise.toml` e `.nvmrc`
- **npm 10+**
- **Go 1.27** — fixado em `mise.toml`, necessário para rodar desafios em Go
- **Java 25 (Temurin)** — fixado em `mise.toml`, necessário para rodar desafios em Java
- **Python 3.14** — fixado em `mise.toml`, necessário para rodar desafios em Python
- **gopls** — servidor de linguagem de Go, para completação e erros no editor:
  `go install golang.org/x/tools/gopls@latest`
- **jdtls** — servidor de linguagem de Java. Baixe de
  [download.eclipse.org/jdtls](https://download.eclipse.org/jdtls/snapshots/), descompacte e
  deixe o `bin/` no `PATH` — o jogo usa isso só para achar a instalação; quem sobe o
  servidor é a JVM ([ADR 0051](docs/decisions/0051-jdtls-sem-python.md)).

Sem os servidores de linguagem o jogo roda: o editor perde completação e erros ao vivo, e a
barra da quest mostra "sem servidor".

Com [mise](https://mise.jdx.dev): `mise install` na raiz resolve Node, Go, Java e Python.

TypeScript não precisa de nada: o Electron já traz o Node, que executa `.ts` direto.

## Estrutura

```text
apps/game/                 Electron: main, preload e renderer (Vite, Phaser, Monaco)
packages/core/             o dominio -- contratos, entidades, regras e portas
packages/runner/           executor local: diretorio de trabalho, timeouts, kill de arvore
packages/lang-typescript/  adapter de TypeScript
packages/lang-go/          adapter de Go (harness em templates/*.go)
packages/lang-java/        adapter de Java (harness e JSON em templates/*.java)
packages/lang-python/      adapter de Python (harness em templates/*.py)
packages/lsp/              ponte JSON-RPC para servidores de linguagem
docs/                      visao, arquitetura, ADRs, roadmap e questoes em aberto
```

## Como rodar

```bash
npm install     # na raiz, instala todos os workspaces
npm run dev     # abre a janela do Electron com HMR no renderer
```

No jogo: pressione **E** para falar com o Monitor, escreva a solução, clique em Executar.

Outros scripts, todos na raiz:

```bash
npm run build      # compila os pacotes e o app (saida em apps/game/out)
npm run lint       # Biome (lint + format check)
npm run typecheck  # tsc --noEmit em todos os workspaces
npm test           # Vitest
```

`npx biome check --write .` aplica as correções de formatação.

## Estado

Fase A: a mecânica. A quest "hello world" é resolvível dentro do jogo nas quatro linguagens —
TypeScript, Go, Java e Python. Ainda não existem campus, mapa, arte nem história — isso é Fase B
([ADR 0029](docs/decisions/0029-fase-a-mecanica-antes-do-conteudo.md)).

## Documentação

Comece por [CLAUDE.md](CLAUDE.md) e siga para [docs/](docs/): [visão](docs/vision.md),
[arquitetura](docs/architecture.md), [ADRs](docs/decisions/README.md),
[roadmap](docs/roadmap.md) e [questões em aberto](docs/open-questions.md).
