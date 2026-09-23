# 0007 — Válvula de escape: `customTests`

- Status: aceita
- Data: 2026-09-22

## Contexto

Alguma quest eventualmente vai precisar de uma verificação que não cabe em
"chamar uma função e comparar o retorno".

## Decisão

Uma quest pode declarar **`customTests: true`** e trazer testes escritos à mão, só para as
linguagens que ela suportar.

É **exceção, não padrão**.

## Consequências

- Casos difíceis não travam o projeto nem distorcem o modelo geral.
- Uma quest com `customTests` não funciona automaticamente em linguagem nova; ela precisa
  ser portada à mão.
- Se o uso deixar de ser raro, o sinal é que o modelo de [0004](0004-testes-como-dados.md)
  está incompleto e precisa ser revisto.

## Alternativas descartadas

- **Proibir qualquer teste customizado:** limitaria o desenho das quests.
- **Tratar testes à mão como caminho normal:** é exatamente a alternativa rejeitada em
  [0004](0004-testes-como-dados.md).
