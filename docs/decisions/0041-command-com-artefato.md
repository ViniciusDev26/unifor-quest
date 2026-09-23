# 0041 — `Command` distingue toolchain de artefato

- Status: aceita
- Data: 2026-09-23

## Contexto

Até Go, todo comando que o runner executava era um toolchain: `node harness.ts`. O contrato
da porta `LanguageAdapter` refletia isso — um `Command` era `{ toolchain, args }`, e o
runner resolvia o nome lógico para um executável (ADR 0021).

Uma linguagem compilada quebra essa forma: depois de `go build`, o que precisa rodar é o
**binário recém-produzido dentro do diretório de trabalho**, que não é toolchain nenhum.

## Decisão

`Command` vira uma união discriminada:

```text
{ kind: 'toolchain', toolchain, args }   resolvido pelo app (ADR 0021)
{ kind: 'artifact',  path, args }        caminho dentro do diretorio de trabalho
```

## Consequências

- Linguagens compiladas passam a ser expressáveis sem que o adapter saiba caminhos
  absolutos ou plataformas.
- Foi **a única mudança de contrato** que a primeira linguagem compilada exigiu. O resto do
  adapter é o que a [0003](0003-multi-linguagem-custo-por-adapter.md) prometia: mapeamento
  de tipos, stub, harness — sem tocar em quest nenhuma.
- O adapter de TypeScript mudou uma linha.
- O runner ganhou um ponto único onde um comando vira algo executável, o que é também onde
  a resolução por plataforma vai entrar ([0025](0025-suporte-a-linux-e-macos.md)).

## Alternativas descartadas

- **`go run .` em vez de compilar e executar:** caberia no contrato antigo, ao custo de
  perder o timeout separado de compilação e execução que a
  [0009](0009-execucao-no-main-process.md) exige, e de recompilar a cada rodada.
- **Deixar o adapter devolver um caminho absoluto:** obrigaria o adapter a conhecer o
  diretório de trabalho e a plataforma, que é exatamente o que a porta esconde.
