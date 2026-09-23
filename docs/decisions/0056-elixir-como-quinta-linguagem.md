# 0056 — Elixir como quinta linguagem

- Status: aceita
- Data: 2026-09-23

## Contexto

Python tinha medido o custo de uma linguagem interpretada e dinamicamente tipada contra a
abstração de [0003](0003-multi-linguagem-custo-por-adapter.md)
([0052](0052-python-como-quarta-linguagem.md)). Faltava medir a mesma abstração contra uma
linguagem **funcional, imutável, e rodando numa VM que nenhuma das quatro anteriores usa** —
o BEAM. Três problemas não tinham precedente nas outras quatro:

- **Contagem de `ops`.** O prelude `Graph` conta operações num contador global mutável
  ([0054](0054-prelude-graph-e-contagem.md)). Elixir não tem variável global mutável.
- **Struct em tempo de execução.** `%Nome{}` exige que o módulo já esteja conhecido em tempo
  de **compilação** do arquivo onde aparece. O harness é gerado e carregado em tempo de
  **execução**, um arquivo por vez — exatamente o caso em que essa sintaxe não resolve.
- **JSON na stdlib.** Diferente de Python, a resposta não era óbvia: o módulo `JSON` só
  existe embutido a partir do Elixir 1.18/OTP 27; antes disso a biblioteca padrão da
  comunidade é `Jason`, uma dependência externa.

## Decisão

**Elixir é uma linguagem jogável**, com adapter (`packages/lang-elixir`) e servidor de
linguagem ([0057](0057-elixir-ls-sem-o-launcher-oficial.md)). Três escolhas resolvem os três
problemas:

- **`Process.put`/`Process.get` para `ops`.** O contador vive no dicionário do processo do
  harness — a forma idiomática do BEAM de ter um mutável escondido sem vazar para a
  assinatura da função do jogador.
- **`struct(Modulo, campos)` em vez de `%Modulo{}`** em todo código que o harness gera. O
  jogador continua livre para escrever `%Nome{}` no próprio `solution.ex`, porque ali o
  módulo do struct e o código que o usa compilam juntos, no mesmo arquivo — o problema é só
  do harness, que decodifica argumentos vindos de fora.
- **O módulo `JSON` embutido**, o que fixa a versão mínima: `mise.toml` pina
  `elixir = "1.20.4-otp-29"` e `erlang = "29.1.1"`. Sem isso o harness precisaria escrever o
  próprio codec, como [0048](0048-json-escrito-a-mao-no-java.md) fez para Java — mas ali a
  stdlib nunca teria um, e aqui a versão pinada já resolve.

Sem etapa de compilação: `prepare().compile` é `null` e o `run` é `elixir harness.exs`, a
mesma forma de Python e Java.

## Consequências

- **Custou um adapter e a fixação de versão em `mise.toml`.** Nenhuma mudança em `core`, no
  runner, no protocolo do harness ou em quest alguma — só a entrada nova em `LanguageId`. O
  requisito da [0003](0003-multi-linguagem-custo-por-adapter.md) segue medido: Go, um adapter
  mais extensão de contrato ([0041](0041-command-com-artefato.md)); Java e Python, um adapter
  cada; Elixir, um adapter mais uma versão mínima de toolchain.
- Elixir e Erlang/OTP são **dois runtimes**, não um — diferente de Go, Java, Python e Node,
  onde o executável que o jogo chama é o runtime inteiro. `elixir` executa `erl` por baixo, e
  os dois precisam ser resolvidos e postos no `PATH` um do outro.
- Nem `elixir` nem `erl` têm um subcomando que imprima a própria raiz de instalação — ao
  contrário de `go env GOROOT` ou de perguntar ao Python por `sys.executable`. O resolvedor
  em `apps/game` pergunta ao **mise** diretamente, que já é a fonte documentada de toolchains
  de desenvolvimento deste projeto ([0021](0021-runtimes-empacotados-no-instalador.md)) — não
  é uma dependência nova, é a mesma um nível abaixo.
- `monaco-editor` não traz um tokenizer para Elixir entre as `basic-languages`, diferente das
  outras quatro. O jogo registra um Monarch básico em `apps/game`, só para colorir a sintaxe
  — a análise de verdade continua sendo o servidor de linguagem
  ([0044](0044-ponte-lsp-propria.md)).

## Alternativas descartadas

- **Projeto Mix com etapa de compilação**, à semelhança de Go: mais "projeto de verdade"
  ([0047](0047-projeto-em-vez-de-arquivo.md)), mas exigiria um segundo timeout e cache de
  build sem necessidade — nada aqui compila para bytecode nativo do jeito que o Go compila
  para binário; a interpretação de `.exs` já é rápida o bastante.
- **Escrever o próprio codec JSON**, como [0048](0048-json-escrito-a-mao-no-java.md). Correto
  em princípio, mas o módulo `JSON` embutido a partir de 1.18/OTP 27 resolve o mesmo problema
  sem manter código nenhum — o preço é só fixar a versão mínima, o que o projeto já faz para
  toda linguagem em `mise.toml`.
