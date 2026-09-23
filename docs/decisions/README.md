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
| [0024](0024-runtimes-podados-ao-minimo.md) | ~~Runtimes podados ao mínimo~~ | Suspensa pela 0045: os runtimes entram completos. |
| [0025](0025-suporte-a-linux-e-macos.md) | Linux e macOS suportados | Três plataformas, cada uma com os seus runtimes; Windows continua primário. |
| [0026](0026-diretorio-de-trabalho-e-save.md) | Trabalho separado do save | Save em `userData`, execução em caminho de cache; o cache pode sumir e é re-semeado. |
| [0027](0027-arquitetura-em-aneis.md) | Arquitetura em anéis | Núcleo puro, portas em `core`, `engine` separada, framework só em `apps/`. |
| [0028](0028-vitest-como-runner-de-testes.md) | Vitest | Runner na raiz, testes em `test/`, fora do que vai para `dist/`. |
| [0029](0029-fase-a-mecanica-antes-do-conteudo.md) | Mecânica antes do conteúdo | Fase A fecha com uma quest hello world; campus, arte e história são Fase B. |
| [0030](0030-qualquer-linguagem-e-replay-livre.md) | Qualquer linguagem, replay livre | Toda quest em qualquer linguagem; rejogar não reaplica efeitos; save por quest e linguagem. |
| [0031](0031-codigo-em-ingles.md) | Código em inglês | O que o jogador lê é português; o que o programa é, é inglês. |
| [0032](0032-igualdade-e-validacao-de-valor.md) | Igualdade e validação de valor | Lista é ordenada, campo a mais reprova, sem tolerância de float; chave de `map` é string. |
| [0033](0033-forma-do-graph.md) | A forma do `Graph` | `id`/`label`, posição opcional, arestas não direcionadas, coerência validada. |
| [0034](0034-vocabulario-de-effect-e-prerequisitos.md) | `Effect` e pré-requisitos | Começa só com `setFlag`; `requires` por id de quest e por flag de mundo. |
| [0035](0035-organizacao-do-core-por-papel.md) | `core` organizado por papel | Value objects, entidades, regras e contratos; sem pasta `schemas/`. |
| [0036](0036-core-e-o-dominio.md) | `core` é o domínio | As regras de jogo vivem em `core`; `packages/engine` não será criado. |
| [0037](0037-o-jogo-compara-o-harness-reporta.md) | O jogo compara | Uma implementação de igualdade, não três; o harness só reporta `actual`. |
| [0038](0038-envelope-sem-passed.md) | Envelope sem `passed` | O harness não recebe `expected`, então não teria como preencher o campo. |
| [0039](0039-sem-classes.md) | Sem classes | Closures e composição; nem a cena do Phaser herda. |
| [0040](0040-go-antes-de-java.md) | Go antes de Java | A distância que importava era compilar, e nem TS nem Java compilam. |
| [0041](0041-command-com-artefato.md) | `Command` com artefato | Toolchain ou binário recém-compilado; única mudança de contrato que Go exigiu. |
| [0042](0042-templates-como-arquivos-da-linguagem.md) | Templates são arquivos reais | O harness de Go é `.go`, checado por `go build` e `go vet`. |
| [0043](0043-resolucao-de-toolchain-independente-do-cwd.md) | Toolchain sem depender do cwd | Shim de gerenciador de versão escolhe versão pelo diretório atual, e o runner trabalha fora do projeto. |
| [0044](0044-ponte-lsp-propria.md) | Ponte LSP própria | `gopls` no Monaco oficial, sem o fork que o `monaco-languageclient` exige. |
| [0045](0045-tamanho-do-pacote-nao-e-restricao.md) | Tamanho não é restrição | Runtimes completos; o jogador ganha a biblioteca padrão inteira. |
| [0046](0046-ambiente-de-programacao-de-verdade.md) | Ambiente de verdade, não juiz online | Anti-objetivo declarado: não construir outro beecrowd. |
| [0047](0047-projeto-em-vez-de-arquivo.md) | Projeto, não arquivo | `scaffold` devolve um projeto; multi-arquivo já roda, falta só a interface. |
| [0048](0048-json-escrito-a-mao-no-java.md) | JSON próprio no Java | Java não tem JSON na stdlib; o harness traz o seu, sem jar nem classpath. |
| [0049](0049-saida-do-compilador-relativa.md) | Saída do compilador relativa | O caminho do diretório de trabalho é nosso, não do jogador. |
| [0050](0050-workspace-do-editor-de-java.md) | Workspace do editor de Java | Sem descritor de projeto, o `jdtls` não reporta erro nenhum. |
| [0051](0051-jdtls-sem-python.md) | `jdtls` sem Python | O launcher oficial é um script Python; o jogo invoca o Equinox pela JVM que já tem. |
| [0052](0052-python-como-quarta-linguagem.md) | Python, a quarta linguagem | Custou um adapter e nada mais — o requisito da 0003, medido. |
| [0053](0053-pyright-em-node.md) | Pyright em Node | O servidor de linguagem de Python não custa runtime nenhum. |
