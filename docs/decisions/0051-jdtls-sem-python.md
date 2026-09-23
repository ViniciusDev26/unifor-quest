# 0051 — O `jdtls` sobe pela JVM, não pelo launcher em Python

- Status: aceita
- Data: 2026-09-23

## Contexto

A distribuição do `jdtls` traz um launcher em `bin/jdtls`, e é o que todo editor usa. Ele
resolve o jar do Equinox, escolhe a pasta de configuração da plataforma e monta as dezenas
de flags da JVM.

Ele também é um **script Python 3**.

Usá-lo em produção significaria um jogo que embute Java, Go e Node — e mesmo assim exige
**Python instalado na máquina do jogador** para que o editor funcione. É exatamente o que a
[0046](0046-ambiente-de-programacao-de-verdade.md) recusa.

## Decisão

O jogo invoca o **launcher do Equinox diretamente**, com a mesma JVM que já carrega para
executar desafios em Java:

```text
java -Declipse.application=org.eclipse.jdt.ls.core.id1 ...
     -Dosgi.sharedConfiguration.area=<install>/config_<plataforma>
     -jar <install>/plugins/org.eclipse.equinox.launcher_*.jar
     -data <cache>/jdtls-data
```

A pasta de configuração depende de sistema e arquitetura, e o jar carrega a versão no nome,
então os dois são descobertos em tempo de execução. Em desenvolvimento a instalação é achada
pelo `PATH`; num build empacotado, o caminho aponta para dentro do app
([0021](0021-runtimes-empacotados-no-instalador.md)).

## Consequências

- **O servidor de linguagem de Java não custa nenhum runtime novo.** Ele é uma aplicação
  Java, e o jogo já embute o JDK.
- Um processo a menos na cadeia: era `python → java`, agora é `java`.
- As flags da JVM passam a ser nossas, e uma versão nova do `jdtls` que mude o que o
  launcher faz pode exigir acompanhar.
- **Se um dia o jogo embutir Python** — por exemplo para suportar Python como linguagem
  jogável —, isso não muda: a invocação direta continua sendo um processo a menos e uma
  dependência a menos entre o jogo e o editor.

## Alternativas descartadas

- **Embutir Python só para rodar o launcher:** um runtime inteiro para executar um script de
  conveniência cujo trabalho cabe em trinta linhas.
- **Exigir Python do jogador:** é o modelo de instalação que este projeto existe para não
  repetir.
