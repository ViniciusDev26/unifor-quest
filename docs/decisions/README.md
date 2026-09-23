# Decisões de arquitetura (ADRs)

Uma decisão por arquivo, numerada e imutável: decisão que muda não é reescrita, ganha um
ADR novo que a substitui ou amplia.

Não reabra nenhuma delas sem perguntar antes. Ao tomar uma decisão nova, crie o ADR aqui e
atualize [`CLAUDE.md`](../../CLAUDE.md) e [`architecture.md`](../architecture.md) na mesma
mudança.

| # | Decisão | Em uma linha |
| --- | --- | --- |
| [0001](0001-plataforma-desktop-electron.md) | Plataforma desktop com Electron | Electron, Windows x64, com a stack fixada — o navegador não roda compilador local. |
| [0002](0002-monorepo-npm-workspaces.md) | Monorepo com npm workspaces | `apps/*` e `packages/*`; pacote interno é referenciado pelo nome com versão `"*"`. |
| [0003](0003-multi-linguagem-custo-por-adapter.md) | Custo de uma linguagem = um adapter | Requisito acima de tudo: o custo nunca pode crescer com o número de quests. |
| [0004](0004-testes-como-dados.md) | Testes como dados | Assinatura em tipos neutros e casos em JSON; o código roda nativo, só dados cruzam. |
| [0005](0005-adapter-por-linguagem.md) | Adapter por linguagem | Gera stub, harness e prelude, mapeia tipos e traduz erros do compilador. |
| [0006](0006-protocolo-do-harness.md) | Protocolo do harness | Casos pelo stdin, todos os testes numa execução, envelope JSON com nonce. |
| [0007](0007-valvula-de-escape-custom-tests.md) | Válvula de escape `customTests` | Testes à mão por linguagem são permitidos, como exceção rara. |
| [0008](0008-quest-engine-no-renderer.md) | Quest Engine no renderer | Lógica de jogo junto do Phaser; o main expõe só o mínimo pelo `contextBridge`. |
| [0009](0009-execucao-no-main-process.md) | Execução no main, atrás de `Executor` | Diretório temporário, timeouts separados e kill da árvore de processos. |
| [0010](0010-sem-docker.md) | Sem Docker | O risco é loop infinito e processo órfão, não código malicioso. |
| [0011](0011-metricas-por-contagem-de-operacoes.md) | Métricas por contagem de operações | `ops` das estruturas instrumentadas; tempo é ruído de startup de processo. |
| [0012](0012-grafo-do-campus-no-tiled.md) | Grafo do campus no Tiled | Um dado só alimenta mapa, desafios de grafo e animação da rota. |
| [0013](0013-codigo-com-consequencia-no-mundo.md) | Código com consequência no mundo | `onSuccess` recebe o retorno real do código do jogador. |
| [0014](0014-quests-declarativas.md) | Quests declarativas | Quest é dado: NPC, flags, diálogos, desafio e `onSuccess`. |
| [0015](0015-validar-com-typescript-e-java.md) | Validar cedo com TypeScript e Java | Duas linguagens distantes definem a abstração; conformance é obrigatória. Ampliada pela 0016. |
| [0016](0016-go-no-mvp.md) | Go entra no MVP | O MVP suporta TypeScript, Java e Go; Go é o primeiro adapter que testa a abstração. |
| [0017](0017-type-safety-total.md) | Type safety total | Sem `any`, sem `!`, sem cast de conveniência; dado externo entra como `unknown` e é validado. |
| [0018](0018-env-validado-com-zod.md) | Env validado com Zod num `env.ts` | `process.env` é lido num só lugar por processo e validado na inicialização. |
| [0019](0019-zod-no-core.md) | Zod no `core` | Schema é a fonte, tipo sai de `z.infer`; a regra de dependência vale para pacotes do monorepo. |
| [0020](0020-autosave-por-quest.md) | Autosave por quest | Sem save manual: cada quest concluída dispara a gravação, que precisa ser atômica. |
| [0021](0021-runtimes-empacotados-no-instalador.md) | Runtimes no instalador | Sem servidor e sem instalação pelo jogador; em dev, os toolchains do `mise`. |
| [0022](0022-go-versao-cache-e-cgo.md) | Go: versão, cache e cgo | Última estável, `GOCACHE` pré-aquecido no instalador, `CGO_ENABLED=0`. |
| [0023](0023-java-roda-do-fonte.md) | Java roda do fonte | `java Main.java` (JEP 458), Temurin 25 LTS; sem `.class`, sem binário novo por execução. |
| [0024](0024-runtimes-podados-ao-minimo.md) | Runtimes podados ao mínimo | Só o necessário para compilar e rodar; adiciona-se depois, se faltar. |
| [0025](0025-suporte-a-linux-e-macos.md) | Linux e macOS suportados | Três plataformas, cada uma com os seus runtimes; Windows continua primário. |
| [0026](0026-diretorio-de-trabalho-e-save.md) | Trabalho separado do save | Save em `userData`, execução em caminho de cache; o cache pode sumir e é re-semeado. |
| [0027](0027-arquitetura-em-aneis.md) | Arquitetura em anéis | Núcleo puro, portas em `core`, `engine` separada, framework só em `apps/`. |
| [0028](0028-vitest-como-runner-de-testes.md) | Vitest | Runner na raiz, testes em `test/`, fora do que vai para `dist/`. |
| [0029](0029-fase-a-mecanica-antes-do-conteudo.md) | Mecânica antes do conteúdo | Fase A fecha com uma quest hello world; campus, arte e história são Fase B. |
| [0030](0030-qualquer-linguagem-e-replay-livre.md) | Qualquer linguagem, replay livre | Toda quest em qualquer linguagem; rejogar não reaplica efeitos; save por quest e linguagem. |
| [0031](0031-codigo-em-ingles.md) | Código em inglês | O que o jogador lê é português; o que o programa é, é inglês. |
