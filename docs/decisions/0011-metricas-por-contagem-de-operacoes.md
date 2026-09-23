# 0011 — Métricas por contagem de operações, não por tempo

- Status: aceita
- Data: 2026-09-22

## Contexto

O jogo quer mostrar complexidade — comparar duas soluções para o mesmo problema. Medir
tempo de parede não serve: o custo é dominado pelo startup do processo e pelo ruído da
máquina, e varia entre linguagens por motivos que não têm a ver com o algoritmo.

## Decisão

As métricas de complexidade usam **contagem de operações**.

As estruturas instrumentadas fornecidas pelo jogo no prelude (ex.: `Graph.neighbors()`
contado) produzem o campo **`ops`** do envelope, apresentado ao jogador como
"nós explorados".

## Consequências

- A métrica é determinística e comparável entre linguagens e entre execuções.
- Só é contado o que passa pelas estruturas do prelude; um algoritmo que ignore o `Graph`
  do jogo não gera métrica.
- Cada tipo de domínio novo precisa decidir o que conta como operação.
- O campo `ms` do envelope continua existindo, como informação, não como métrica de
  complexidade.

## Alternativas descartadas

- **Cronometrar a execução:** ruído maior que o sinal, e compara runtime em vez de
  algoritmo.
