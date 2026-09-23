# 0055 — A suite de conformance

- Status: aceita
- Data: 2026-09-23

## Contexto

A [0015](0015-validar-com-typescript-e-java.md) previa uma suite que todo adapter precisa
passar antes de entrar no jogo. Até aqui, cada adapter foi verificado à mão, com um script
diferente por linguagem — o que provou que cada um funciona e não prova que os quatro
**concordam**.

É justamente a divergência silenciosa entre linguagens que o projeto teme: "passou em Java,
falhou em Go" no mesmo código correto.

## Decisão

`packages/conformance` descreve o contrato de um adapter **como comportamento**, num
conjunto de cenários rodados contra os quatro:

| Cenário | O que garante |
| --- | --- |
| o projeto entregue roda | o scaffold é um projeto válido da linguagem |
| solução correta resolve, e o que imprime é capturado | o caminho feliz e a captura de stdout |
| resposta errada falha **sem erro** | errar não é o mesmo que quebrar |
| exceção vira erro com a mensagem do jogador | o que ele lê é o que ele escreveu |
| laço infinito é interrompido | timeout e encerramento da árvore de processos |
| projeto com mais de um arquivo | [0047](0047-projeto-em-vez-de-arquivo.md) vale em todas |
| todos os tipos atravessam a fronteira | `int`, `float`, `bool`, `string`, `list`, `map`, `nullable` |
| o grafo conta nós explorados | [0054](0054-prelude-graph-e-contagem.md) |

Um cenário sem solução para uma linguagem usa o projeto que o adapter entrega, que é como
"o projeto intocado roda" é testado sem escrevê-lo quatro vezes. Uma solução substitui os
arquivos que nomeia e mantém o resto do scaffold, e é por isso que `go.mod` e o prelude
sobrevivem sem cada cenário repetir os dois.

**Uma linguagem cujo toolchain não está instalado é pulada, não reprovada.** A suite precisa
rodar numa máquina que só tem Node, e dizer "pulado" é honesto onde "passou" não seria.

## Consequências

- O contrato do adapter deixa de ser prosa nas ADRs e passa a ser executável.
- Uma linguagem nova tem um roteiro: passe nestes cenários.
- **O que custa tempo é esperar, não compilar.** A primeira versão levava 45 s, e 40 deles
  eram o cenário do laço infinito esperando o limite de produção quatro vezes. Só o cenário
  que é *sobre* o timeout declara o seu — dois segundos provam o mesmo que dez —, e as
  quatro linguagens correm lado a lado, porque não se tocam. A suite passou a levar 5 s.
  O resto dos testes do projeto leva 0,2 s, então o custo real de ter quatro linguagens é
  esse.
- Ela depende dos quatro adapters, o que inverte a direção normal das dependências do
  monorepo. É dependência de desenvolvimento e existe só para isto.
- Os quatro passaram na primeira execução completa. Isso é menos uma conquista da suite do
  que um efeito de cada adapter ter sido verificado à mão antes; o valor dela é do próximo
  adapter em diante, e de impedir regressão.

## Alternativas descartadas

- **Continuar verificando à mão:** funciona uma vez por adapter, não impede regressão e não
  compara linguagens entre si.
- **Reprovar quando falta toolchain:** transformaria "não tenho Go instalado" em falha de
  teste, e ninguém rodaria a suite.
