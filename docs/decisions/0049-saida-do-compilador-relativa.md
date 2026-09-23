# 0049 — A saída do compilador é relativa ao diretório de trabalho

- Status: aceita
- Data: 2026-09-23

## Contexto

O erro do compilador é a mensagem que o jogador mais lê, e cada toolchain nomeia os
arquivos do jeito que os recebeu. Go, invocado com `.`, respondia
`./solution.go:4:9`. Java, invocado com o caminho do harness, respondia:

```text
/home/alguem/.cache/unifor-quest/run/java/work/Solution.java:3: error: ...
```

Aquele caminho é nosso, não do jogador — ele nem sabe que existe um diretório de cache
([0026](0026-diretorio-de-trabalho-e-save.md)). É ruído em cima da informação mais
importante da tela.

## Decisão

O runner **remove o diretório de trabalho** de tudo que um toolchain imprime, antes de
colocar no envelope. A mensagem acima chega ao jogador como:

```text
Solution.java:3: error: incompatible types: int cannot be converted to String
```

## Consequências

- Vale para toda linguagem, presente e futura, em um lugar só — em vez de cada adapter
  aprender a limpar a própria saída.
- O que sobra é exatamente o que o jogador vê no editor: nome de arquivo e linha, que é o
  que a [0006](0006-protocolo-do-harness.md) pedia ao manter o código do jogador em arquivo
  próprio.
- Quando as marcações do compilador virarem diagnostics no Monaco, o caminho já estará no
  formato que o editor espera.

## Alternativas descartadas

- **Deixar como vem:** o caminho absoluto expõe um detalhe interno e empurra a mensagem
  útil para fora da tela.
- **Cada adapter limpar a sua saída:** a mesma regra repetida por linguagem, com uma
  esquecendo.
