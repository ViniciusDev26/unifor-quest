# 0040 — Go antes de Java

- Status: aceita
- Data: 2026-09-23
- Altera a ordem de [0015](0015-validar-com-typescript-e-java.md) e [0016](0016-go-no-mvp.md)

## Contexto

A [0015](0015-validar-com-typescript-e-java.md) mandava implementar TypeScript e Java
primeiro, por serem o par mais distante, e a [0016](0016-go-no-mvp.md) manteve essa ordem
com Go em terceiro.

Só que, feito o adapter de TypeScript, ficou claro qual era o eixo realmente não exercitado:
**compilação**. TypeScript roda direto do fonte, e Java também, por decisão nossa
([0023](0023-java-roda-do-fonte.md)). Nenhum dos dois usa a etapa de compilação do
`Executor`, o timeout separado nem o artefato gerado. Go usa os três.

## Decisão

**Go vem antes de Java.**

Java continua no escopo; o que muda é a ordem. O critério da
[0015](0015-validar-com-typescript-e-java.md) — validar cedo contra a linguagem mais
distante — passa a apontar para Go, porque a distância que importa é compilar.

## Consequências

- O caminho de duas etapas do [0009](0009-execucao-no-main-process.md) foi exercitado de
  verdade, e cobrou uma extensão do contrato: ver
  [0041](0041-command-com-artefato.md).
- A diferença entre compilação fria e cache quente apareceu medida — 1,5 s contra 0,1 s —,
  o que confirma na prática o `GOCACHE` pré-aquecido da
  [0022](0022-go-versao-cache-e-cgo.md) antes de o instalador existir.
- Erro de compilação passou a ter mensagem de verdade, apontando arquivo e linha do jogador
  (`./solution.go:4:9`), que é o que a [0006](0006-protocolo-do-harness.md) pedia.
- A suite de conformance ([0015](0015-validar-com-typescript-e-java.md)) continua pendente,
  e agora nasce com dois adapters bem diferentes para arbitrar, em vez de um.

## Alternativas descartadas

- **Manter Java em segundo:** validaria tipagem nominal e ferramental pesado, mas deixaria
  a etapa de compilação sem nenhum exercício, porque Java roda do fonte
  ([0023](0023-java-roda-do-fonte.md)).
