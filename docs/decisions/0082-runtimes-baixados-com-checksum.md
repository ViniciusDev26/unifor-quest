# 0082 — Os runtimes do instalador são baixados das fontes oficiais, com versão e checksum fixos

- Status: aceita
- Data: 2026-11-20
- Implementa a [0021](0021-runtimes-empacotados-no-instalador.md) e resolve o card #34

## Contexto

A [0021](0021-runtimes-empacotados-no-instalador.md) decidiu que o instalador traz os
runtimes, e a [0045](0045-tamanho-do-pacote-nao-e-restricao.md), que vêm completos. Faltava
decidir três coisas:
- de onde cada runtime vem;
- como garantir que o arquivo é o certo;
- como o jogo os encontra depois de instalado.

Em desenvolvimento, `executor.ts` perguntava ao ambiente (`go env GOROOT`, `mise where`).
Um jogo instalado não tem mise nem `PATH` preparado.

## Decisão

**`scripts/fetch-runtimes.mjs` baixa cada runtime de uma fonte oficial, fixada por URL e
sha256 em `apps/game/runtimes.lock.json`, e monta a mesma estrutura de pastas em toda
plataforma.**

| Runtime | Versão | Fonte |
| --- | --- | --- |
| Go | 1.27.1 | go.dev |
| JDK | Temurin 25.0.5+8 | Adoptium (JDK completo, por causa do `javac`) |
| Python | 3.14.10 | python-build-standalone (astral-sh), `install_only` |
| Erlang/OTP | 29.1.1 | Windows: zip oficial do erlang/otp; macOS: erlef/otp_builds; Linux: builds da Hex para Ubuntu 22.04 |
| Elixir | 1.20.4 | zip pré-compilado para OTP 29 (elixir-lang) |
| ElixirLS | 0.31.1 | release do elixir-lsp |
| jdtls | 1.62.0 | download.eclipse.org |
| gopls | v0.23.0 | compilado do código-fonte com o Go fixado, pelo proxy de módulos (verificado pelo sumdb) |

### Como o script funciona

- **Nada é usado antes de o hash bater.** Os arquivos baixados ficam em
  `apps/game/runtimes/.downloads/`, e a segunda execução só remonta as pastas.
- **A estrutura** de `runtimes/<os>-<arch>/` é sempre a mesma: `go/`, `jdk/`, `python/`,
  `erlang/`, `elixir/`, `elixir-ls/`, `jdtls/` e `gopls/`. O electron-builder copia essa
  pasta para `resources/runtimes/` ([0081](0081-electron-builder.md)).
- **O Erlang é relocável.** Os scripts `erl` e `start` guardam o caminho absoluto da
  instalação, e o jogo fica onde o jogador o põe (um AppImage monta num caminho novo a cada
  execução). O script reescreve a linha `ROOTDIR` para achar a raiz a partir do próprio
  arquivo. O build da Hex para Linux vem sem instalar, e o script roda o `Install -minimal`
  antes.
- **Na própria plataforma, cada runtime responde à versão** (`go version`, `java -version`,
  `erl`, `gopls version`) antes de o script terminar. Uma estrutura quebrada falha ali, e não
  no computador do jogador.
- **Atualizar uma versão** é trocar URL e sha256 no `runtimes.lock.json`, seguindo o
  `mise.toml`.

### Como o jogo encontra os runtimes

- `apps/game/src/main/bundled-runtimes.ts` devolve a pasta de cada runtime em
  `process.resourcesPath/runtimes/` quando o app está empacotado.
- Cada resolvedor de `executor.ts`, `jdtls.ts` e `elixir-ls.ts` olha primeiro ali e só então
  cai no caminho de desenvolvimento.

## Consequências

- O jogo instalado roda as cinco linguagens e os quatro servidores de linguagem sem nada no
  `PATH`. Isso foi testado no AppImage com `PATH=/usr/bin:/bin`: os desafios passam em
  TypeScript, Go, Java, Python e Elixir, e gopls, jdtls, Pyright e ElixirLS respondem ao
  `initialize`.
- No Linux, os runtimes somam 1,1 GB descompactados, e o AppImage passa de 150 MB para cerca
  de 600 MB ([0045](0045-tamanho-do-pacote-nao-e-restricao.md)).
- **O Erlang de Linux exige** glibc 2.34 ou mais nova, `libtinfo6` e `libcrypto.so.3`
  (OpenSSL 3). Isso cobre Ubuntu 22.04, Debian 12, Fedora 36 e posteriores. Os outros
  runtimes não pedem nada do sistema.
- O CI precisa de rede para empacotar. As fontes são as mesmas que `setup-go`,
  `setup-java` e `setup-beam` já usam.

## Alternativas descartadas

- **Copiar os toolchains do mise da máquina que empacota:** o resultado depende de como
  cada máquina instalou cada coisa. No Linux, o Erlang do mise é compilado localmente e
  ligado às bibliotecas daquela máquina.
- **Baixar a versão mais recente a cada build:** builds diferentes sairiam com runtimes
  diferentes, sem registro de qual foi qual.
- **Conferir só o checksum publicado junto do arquivo, sem fixá-lo:** protege contra
  download corrompido, mas não contra um arquivo trocado na origem.
