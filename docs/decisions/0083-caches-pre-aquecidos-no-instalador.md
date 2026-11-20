# 0083 — O instalador leva o GOCACHE aquecido e o ElixirLS já compilado

- Status: aceita
- Data: 2026-11-20
- Resolve a [questão 4](../open-questions.md) e o card #35; implementa o cache semeado da
  [0022](0022-go-versao-cache-e-cgo.md) e estende a [0057](0057-elixir-ls-sem-o-launcher-oficial.md)

## Contexto

Dois toolchains fazem trabalho pesado na primeira vez que o jogador os usa.

- **Go:** o primeiro "Executar" compila a biblioteca padrão. Na máquina de desenvolvimento
  leva 1,6 s, mas a [0022](0022-go-versao-cache-e-cgo.md) registrou mais de 20 s num Windows
  com o Defender inspecionando cada binário.
- **ElixirLS:** o `launch.exs` do release roda `Mix.install` em toda partida. Na primeira,
  ele baixa o código do servidor do GitHub e as dependências do Hex e compila tudo: cerca de
  20 s, com rede. Nas seguintes, ainda confere as dependências git com o comando `git`.
  Testado sem `git`, ele recusa partir ("lock mismatch"), e um jogador no Windows não tem
  `git`. Sem rede, num projeto Mix, ele também para esperando permissão para instalar o Hex.

## Decisão

**Os dois caches são gerados no empacotamento, na própria plataforma de destino, e o
instalador os leva prontos.** `scripts/fetch-runtimes.mjs` faz isso depois de baixar os
runtimes ([0082](0082-runtimes-baixados-com-checksum.md)).

### Go

- O script compila um programa que importa os pacotes da biblioteca padrão que o harness e o
  código dos desafios usam, com `GOCACHE=runtimes/<os>-<arch>/go-cache/`. São cerca de 40 MB.
- As entradas do cache não dependem de onde o Go está. Isso foi testado movendo o Go e o
  projeto de pasta: o build continuou levando 0,1 s, contra 1,6 s com o cache frio.
- Na primeira execução em Go, o jogo copia `go-cache/` para o `GOCACHE` gravável
  ([0026](0026-diretorio-de-trabalho-e-save.md)). Um cache que já existe não é tocado.

### ElixirLS

- O script roda o `quiet_install.exs` do release, ou seja, o mesmo `Mix.install`, com
  `MIX_HOME`, `HEX_HOME` e `MIX_INSTALL_DIR` temporários. Depois guarda só os módulos
  compilados (`_build/dev/lib`, com os links resolvidos) em `elixir-ls/prebuilt/` e o Hex em
  `elixir-ls/mix-home/`.
- No jogo instalado, o servidor parte de `launch-bundled.exs` (fonte em
  `apps/game/packaging/elixir-ls-launch.exs`), e não do `launch.exs`. Ele carrega o
  `installer.exs` só para definir o shell silencioso do Mix, inicia o Mix, põe cada `ebin` de
  `prebuilt/` no code path e chama `ElixirLS.LanguageServer.main()`. Não há `Mix.install`,
  `git` nem rede.
- O `MIX_HOME` do servidor é uma pasta do jogo (`run/mix`), semeada de `mix-home/` na
  primeira vez. Nunca é o `~/.mix` do jogador.

### Desenvolvimento

Em desenvolvimento nada muda: o ElixirLS continua partindo do `launch.exs`, e o `GOCACHE`
começa vazio.

## Consequências

- O primeiro uso funciona **sem rede**. Isso foi testado no app empacotado de Linux, dentro
  de um namespace sem rede e com a pasta de cache vazia:
  - as cinco linguagens resolvem o desafio, e o Go roda em 0,23 s na primeira vez;
  - gopls, jdtls, Pyright e ElixirLS respondem ao `initialize`, o ElixirLS em 0,8 s.
- O instalador cresce cerca de 56 MB, somando o `go-cache/` e o ElixirLS compilado.
- Os caches só podem ser gerados na própria plataforma. O script avisa e pula essa etapa
  quando o alvo é outro, e o CI empacota cada alvo numa máquina dele.
- Atualizar o ElixirLS exige conferir se `launch-bundled.exs` ainda bate com o `launch.exs`
  da versão nova: ele repete a parte do `launch.exs` que vem depois da instalação.

## Alternativas descartadas

- **Levar o cache do `Mix.install` inteiro e deixar o `launch.exs` usá-lo:** continua
  chamando `git` para conferir as dependências e falha sem ele.
- **Exigir `git` do jogador:** contraria a [0021](0021-runtimes-empacotados-no-instalador.md);
  o jogador não instala nada.
- **Compilar o ElixirLS na primeira vez que o jogador abre um desafio em Elixir:** pede rede
  e uns 20 s, justamente na primeira impressão da linguagem.
