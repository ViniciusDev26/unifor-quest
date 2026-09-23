# 0050 — O workspace do editor de Java carrega um descritor de projeto

- Status: aceita
- Data: 2026-09-23

## Contexto

Ligado o `jdtls` pela mesma ponte do Go ([0044](0044-ponte-lsp-propria.md)), ele subia,
respondia completação e hover — e **não reportava nenhum erro**. Um `return 42;` numa função
que devolve `String` passava em silêncio.

O motivo: para o `jdtls`, um `.java` solto numa pasta sem descritor de projeto é texto. Ele
só compila, e portanto só reporta erros, o que pertence a um projeto.

## Decisão

O workspace do servidor de linguagem de Java recebe um **descritor de projeto Eclipse** —
`.project` e `.classpath` — apontando a raiz como diretório de fontes.

Esses arquivos ficam **só no workspace do editor**, declarados em `languageServer`, e não no
projeto que o jogador recebe do `scaffold` ([0047](0047-projeto-em-vez-de-arquivo.md)). Eles
são infraestrutura do editor, não código do jogador, e nunca chegam a uma execução.

## Consequências

- O `jdtls` passa a reportar erro de tipo na linha certa, e o editor a pintar a marcação.
- **O projeto do jogador continua limpo:** só `Solution.java`, sem arquivos de ferramenta
  que ele não escreveu e não deveria precisar entender.
- A separação entre `scaffold.files` e `languageServer.workspaceFiles`, que parecia
  duplicação, ganhou razão de existir.
- Se algum dia uma quest precisar de dependências no editor, o `.classpath` é onde elas
  entram.
- A resolução de toolchain ganhou **argumentos de instalação** — o `jdtls` precisa de um
  `-data` apontando para um diretório gravável no cache ([0026](0026-diretorio-de-trabalho-e-save.md)),
  e isso é conhecimento de quem instalou, não do adapter.

## Alternativas descartadas

- **Um `pom.xml`:** também faria o `jdtls` enxergar um projeto, ao custo de um import Maven
  que pode ir à rede — dentro de um jogo que promete não precisar de nada
  ([0046](0046-ambiente-de-programacao-de-verdade.md)).
- **Gradle:** o mesmo, mais pesado.
- **Colocar o descritor no projeto do jogador:** resolveria com menos código e entregaria a
  quem só quer escrever uma função dois arquivos XML de ferramenta.
