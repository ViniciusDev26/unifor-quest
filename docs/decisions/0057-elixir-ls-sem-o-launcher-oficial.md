# 0057 — ElixirLS sobe pelo `launch.exs`, não pelo launcher oficial

- Status: aceita
- Data: 2026-09-23

## Contexto

A distribuição do ElixirLS traz `language_server.sh`/`.bat`, o launcher que todo editor usa.
Ele detecta o shell preferido do usuário e se relança nele, tenta ativar `asdf`, `mise` ou
`vfox` via variáveis de ambiente de shell, e só então chama `launch.exs` — um script Elixir
comum, sem nada disso.

Nada daquilo existe dentro de um processo main do Electron: não há `$SHELL`, não há shell
nenhum rodando o script, e a detecção de versionador por variável de ambiente shell não tem
onde se prender. Mesmo fora desse problema, o launcher `.sh` não é um caminho estável para
achar a instalação: o shim do mise para uma ferramenta não é sempre um link simbólico para o
launcher real — pode ser um binário compilado que o próprio mise gera, e que `realpath` não
atravessa.

## Decisão

O jogo invoca **`launch.exs` diretamente**, com o mesmo `elixir` que já resolve para rodar
desafios em Elixir:

```text
ELS_MODE=language_server elixir <install>/launch.exs
```

A instalação é achada em duas etapas: primeiro por `PATH`, procurando
`language_server.sh`/`.bat` e seguindo o link simbólico até a pasta que tem `launch.exs` ao
lado; se isso não resolver — o caso do shim compilado do mise —, pergunta-se ao `mise` onde
ele instalou `elixir-ls`, a mesma saída de
[0056](0056-elixir-como-quinta-linguagem.md#consequências) para `elixir` e `erl`.

## Consequências

- **O servidor de linguagem de Elixir não custa runtime novo.** É um script Elixir, e o jogo
  já embute o runtime para rodar desafios na linguagem.
- Um processo a menos na cadeia, e nenhuma dependência de shell — o mesmo raciocínio de
  [0051](0051-jdtls-sem-python.md) para o `jdtls`.
- **A primeira execução do ElixirLS busca rede.** `launch.exs` chama
  `ElixirLS.Installer.install_for_launch()`, que resolve e compila as próprias dependências
  (Hex e Git) na primeira vez que roda contra uma versão nova — algo que
  [0046](0046-ambiente-de-programacao-de-verdade.md) recusa para o jogo em si, mas que aqui é
  próprio da distribuição oficial do ElixirLS, não uma escolha deste projeto. Fica cacheado
  depois: execuções seguintes não tocam rede. Um build empacotado precisa desse cache
  pré-aquecido e embutido, o mesmo tratamento que
  [0022](0022-go-versao-cache-e-cgo.md) já dá ao cache de build do Go — registrado em
  [`docs/open-questions.md`](../open-questions.md) como trabalho pendente da Fase B.

## Alternativas descartadas

- **Usar `language_server.sh`/`.bat` diretamente:** depende de um shell e de heurísticas de
  versionador que não existem dentro do Electron, e falha silenciosamente quando o shim não é
  um link simbólico.
- **Reimplementar a detecção de versionador do launcher:** o launcher tenta suportar `asdf`,
  `mise` e `vfox` genericamente; o jogo só precisa saber onde o `elixir` que ele mesmo já
  resolveu está — não precisa da heurística geral.
