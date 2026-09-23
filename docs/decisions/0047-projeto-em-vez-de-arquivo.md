# 0047 — O contrato é um projeto, não um arquivo

- Status: aceita
- Data: 2026-09-23

## Contexto

O adapter entregava um `stub(challenge): string` e o runner escrevia esse texto num arquivo
ao lado do harness. Isso é o modelo do juiz online: uma caixa de texto com uma função — e é
exatamente o que a [0046](0046-ambiente-de-programacao-de-verdade.md) recusa.

O que prende o jogo a um arquivo é essa assinatura. Enquanto ela existir, "e se o jogador
quiser criar um pacote, um servidor, dividir em módulos?" é uma migração atravessando core,
adapters, runner, IPC, save e conteúdo.

## Decisão

**O adapter entrega um projeto**, e a execução recebe um projeto:

```text
scaffold(challenge) -> { files, entry }
prepare({ challenge, playerFiles, nonce }) -> PreparedRun
```

- `entry` é o arquivo que contém a função declarada, e é o que o editor abre.
- `playerFiles` é o projeto inteiro do jogador; o adapter acrescenta o harness e manda
  compilar.
- Em Go, o projeto é um **módulo** — `go.mod` deixa de ser algo que o runner inventa e
  passa a ser um arquivo do jogador.

**A interface continua mostrando um arquivo só.** Árvore de arquivos, abas e criar/apagar
são trabalho de interface, e nenhuma quest precisa disso hoje. O que esta decisão compra é
que, no dia em que precisar, seja só isso — interface.

## Consequências

- Multi-arquivo **já funciona**, sem nenhuma interface: um projeto Go com a solução num
  arquivo e um helper em outro compila e passa, e o mesmo vale em TypeScript com um
  `import` entre arquivos.
- O harness precisa de nomes reservados para não colidir com arquivos do jogador. Hoje são
  `harness.go` e `harness.ts`.
- O save passa a guardar uma **árvore por quest e por linguagem**, não um trecho de texto
  ([0030](0030-qualquer-linguagem-e-replay-livre.md)).
- O workspace do servidor de linguagem passa a ser o mesmo projeto do scaffold, em vez de
  uma lista mantida à parte ([0044](0044-ponte-lsp-propria.md)).
- **A função continua sendo o contrato com o jogo** e o projeto é o espaço do jogador
  ([0046](0046-ambiente-de-programacao-de-verdade.md)): o harness chama uma função e
  compara o retorno, seja o projeto de um arquivo ou de vinte.

## Alternativas descartadas

- **Continuar com um arquivo e mudar quando precisar:** a mudança era barata hoje, com dois
  adapters e uma quest, e ficaria cara exatamente quando houvesse pressa para fazê-la.
- **Fazer a árvore de arquivos junto:** o maior bloco de interface do projeto, para um
  catálogo de quests onde toda solução cabe numa função.
