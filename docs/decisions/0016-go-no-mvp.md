# 0016 — Go entra no MVP

- Status: aceita
- Data: 2026-09-22
- Amplia: [0015](0015-validar-com-typescript-e-java.md)

## Contexto

A [0015](0015-validar-com-typescript-e-java.md) decidiu implementar TypeScript e Java
antes de qualquer outra linguagem, e deixou Go para depois do MVP. Isso deixa o requisito
central do projeto — *adicionar uma linguagem custa um adapter*
([0003](0003-multi-linguagem-custo-por-adapter.md)) — sem prova prática dentro do MVP:
as duas primeiras linguagens são as que *definem* a abstração, não as que a testam.

## Decisão

O MVP suporta **TypeScript, Java e Go**.

A ordem da [0015](0015-validar-com-typescript-e-java.md) continua valendo dentro do MVP:
TypeScript e Java primeiro, por serem o par mais distante entre si, e Go depois que a
suite de conformance estiver estável. Go passa a ser escopo do MVP, não trabalho
posterior.

## Consequências

- O MVP fica maior: três adapters, três conjuntos de diagnostics de compilador, três
  runtimes a distribuir.
- Go é o primeiro adapter escrito **contra** a abstração em vez de junto com ela. O custo
  de escrevê-lo é a medição do requisito da [0003](0003-multi-linguagem-custo-por-adapter.md):
  se for caro, a abstração está errada e é melhor descobrir agora.
- A conformance vira gate de três adapters desde o MVP, o que a torna a peça mais crítica
  do projeto.
- O empacotamento do toolchain de Go entra na questão em aberto do backend de execução,
  junto com o do Java — ver [../open-questions.md](../open-questions.md).

## Alternativas descartadas

- **Go depois do MVP**, como estava na [0015](0015-validar-com-typescript-e-java.md):
  adia para depois da fatia vertical exatamente a prova do requisito que sustenta o
  diferencial do jogo.
- **Go antes de Java:** Go compila, mas é bem mais próximo do TypeScript em tipagem e
  ferramental do que o Java; começar por ele validaria menos a abstração.
