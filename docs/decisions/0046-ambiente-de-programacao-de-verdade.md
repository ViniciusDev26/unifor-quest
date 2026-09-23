# 0046 — O jogo é um ambiente de programação de verdade, não um juiz online

- Status: aceita
- Data: 2026-09-23

## Contexto

O modelo mental óbvio para "escrever código e passar em testes" é o juiz online — beecrowd,
que a faculdade exige, é o exemplo à mão. A experiência dele é ruim por motivos concretos:
Java que não funciona direito, nenhuma linguagem com servidor de linguagem, nenhum
autocompletar, interface hostil e um espaço de trabalho limitado a uma caixa de texto.

Se este jogo for um juiz online com pixel art, ele herda tudo isso.

## Decisão

**O jogo oferece um ambiente de programação de verdade.** O jogador programa como
imaginar: se quiser subir uma API em Go para resolver uma quest, o ambiente não o impede.

Isso é um **anti-objetivo declarado**: não construir outro juiz online. Na prática, vira
uma régua para decidir o resto:

- **Servidor de linguagem de verdade** por linguagem, com autocompletar, hover, erros e
  auto-import ([0044](0044-ponte-lsp-propria.md)).
- **Toolchain de verdade**, o mesmo que a pessoa usaria fora do jogo
  ([0021](0021-runtimes-empacotados-no-instalador.md)).
- **Erros do compilador de verdade**, apontando arquivo e linha do jogador
  ([0006](0006-protocolo-do-harness.md)).
- **Biblioteca padrão inteira**, sem poda ([0045](0045-tamanho-do-pacote-nao-e-restricao.md)).
- **Java que funciona**, que é onde o juiz online costuma falhar
  ([0023](0023-java-roda-do-fonte.md)).
- **Um projeto, não um arquivo.** O espaço do jogador é um projeto da linguagem — módulo
  Go, projeto Java, pacote Node.

### O que isso não afrouxa

A função continua sendo o contrato: o harness chama **uma** função e compara o retorno
([0004](0004-testes-como-dados.md), [0037](0037-o-jogo-compara-o-harness-reporta.md)). Não
há tensão entre isso e "sem restrições", desde que as duas coisas fiquem separadas:

> A função é o contrato com o jogo. O projeto é o espaço do jogador.

Vinte arquivos, uma goroutine e um servidor HTTP são livres, contanto que a função
declarada devolva o que o desafio pede.

## Consequências

- O custo de entrada do projeto é alto de propósito: embutir toolchains e servidores de
  linguagem existe para cumprir essa régua, e é por isso que o tamanho do pacote deixou de
  ser restrição ([0045](0045-tamanho-do-pacote-nao-e-restricao.md)).
- **O contrato do adapter passa a ser multi-arquivo**, mesmo enquanto a interface mostra um
  arquivo só ([0047](0047-projeto-em-vez-de-arquivo.md)). Trocar isso depois seria uma
  migração atravessando core, adapters, runner, IPC, save e conteúdo.
- O save cresce de um trecho de código para uma árvore de arquivos, por quest e por
  linguagem ([0030](0030-qualquer-linguagem-e-replay-livre.md)).
- Quando uma quest precisar de mais de um arquivo, a árvore de arquivos vira trabalho de
  interface, e nada além disso.
- Um ambiente sem restrições também aceita código que trava a máquina do jogador. O limite
  aqui é técnico, não conceitual: timeout e encerramento da árvore de processos
  ([0009](0009-execucao-no-main-process.md)).

## Alternativas descartadas

- **Uma caixa de texto com uma função:** barato, e é exatamente o produto que motivou este
  projeto a existir.
- **Ambiente limitado "por segurança":** o jogador roda o próprio código na própria máquina
  ([0010](0010-sem-docker.md)); restringir o que ele escreve não protegeria ninguém.
