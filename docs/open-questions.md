# Questões em aberto

Decisões ainda **não** tomadas. Quando uma delas for resolvida, ela vira um ADR em
[decisions/](decisions/) e sai daqui.

## 1. Empacotamento e distribuição

Decidido: runtimes embutidos ([ADR 0021](decisions/0021-runtimes-empacotados-no-instalador.md)),
completos, sem poda ([ADR 0045](decisions/0045-tamanho-do-pacote-nao-e-restricao.md)), em
Windows, Linux e macOS ([ADR 0025](decisions/0025-suporte-a-linux-e-macos.md)). O que falta
não é tamanho:

- **Empacotador:** electron-builder ou electron-forge, e como os runtimes entram como
  recurso externo, fora do `asar`.
- **macOS:** assinatura e notarização de cada binário embutido, e quais entitlements o
  hardened runtime exige para rodar uma JVM e executar um binário recém-compilado. É o
  ponto de maior risco técnico do empacotamento.
- **Apple Silicon:** build arm64 separado ou universal.
- **Formato no Linux:** AppImage, `.deb` ou tarball. Formatos com sandbox (Snap, Flatpak)
  restringem spawn de processos e escrita de executáveis, que é o funcionamento normal do
  jogo.

Impacta os passos 5 e 6 do [roadmap](roadmap.md).

## 2. Formato do save

O **gatilho** já está decidido: autosave a cada quest concluída
([ADR 0020](decisions/0020-autosave-por-quest.md)). Falta decidir o resto.

- **O que entra:** o código por quest e por linguagem já está decidido que entra
  ([ADR 0030](decisions/0030-qualquer-linguagem-e-replay-livre.md)), junto com flags e
  progressão. Falta o detalhe do formato.
- **Formato:** provavelmente JSON validado com Zod, mas não está decidido. O local já
  está: `userData` ([ADR 0026](decisions/0026-diretorio-de-trabalho-e-save.md)).
- **Versionamento:** como carregar um save escrito por uma versão anterior do jogo.
- **Um save ou vários:** sem save manual, não há slot escolhido pelo jogador; resta
  decidir se existe mais de um.
- **Código de quest não concluída:** o autosave dispara na conclusão, então o código de
  uma quest em andamento se perde ao fechar o jogo. Isso é aceitável ou precisa de um
  rascunho persistido à parte?

Relacionado: sem sandbox ([ADR 0010](decisions/0010-sem-docker.md)), um save vindo de
terceiros não pode ser tratado como conteúdo confiável.

## 3. JavaScript como linguagem suportada

O [briefing](briefing.md) lista as linguagens iniciais como
**TypeScript, JavaScript, Java e Go**, mas a estrutura planejada do monorepo só prevê
`lang-typescript`, `lang-java` e `lang-go`.

Em aberto: JavaScript é um adapter próprio, um modo do adapter de TypeScript, ou sai da
lista? Não afeta o MVP, que é TypeScript, Java e Go
([ADR 0016](decisions/0016-go-no-mvp.md)).

## 4. Cache do ElixirLS pré-aquecido no empacotamento

A primeira execução do ElixirLS busca rede para compilar as próprias dependências
([ADR 0057](decisions/0057-elixir-ls-sem-o-launcher-oficial.md)). Em desenvolvimento isso
acontece uma vez e fica em cache; um build empacotado precisa desse cache já pronto e
embutido, do mesmo jeito que o `GOCACHE` do Go é semeado a partir do bundle
([ADR 0022](decisions/0022-go-versao-cache-e-cgo.md)).

Em aberto: em que etapa do empacotamento esse cache é gerado (CI, ou uma máquina de
desenvolvimento, versionado como artefato), e onde ele mora dentro do instalador. Junto com
isso, o próprio Erlang/OTP entra como um **segundo runtime** por trás do Elixir — os dois
precisam ser resolvidos e postos no `PATH` um do outro, diferente de Go, Java, Python e Node,
onde um executável carrega o runtime inteiro. Impacta o mesmo passo do
[roadmap](roadmap.md) que a questão 1.



