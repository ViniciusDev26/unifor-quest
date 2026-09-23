# 0048 — O harness de Java traz o próprio JSON

- Status: aceita
- Data: 2026-09-23

## Contexto

Todo harness fala com o jogo por JSON ([0006](0006-protocolo-do-harness.md)). TypeScript tem
`JSON` embutido; Go tem `encoding/json` na biblioteca padrão. **Java não tem JSON nenhum** —
nem para ler, nem para escrever.

As saídas eram empacotar uma biblioteca (Jackson, Gson) com o adapter e passá-la no
classpath, ou escrever o mínimo à mão.

## Decisão

**O harness de Java traz um `Json.java` próprio**, escrito à mão: um parser recursivo e um
escritor, cobrindo exatamente o que atravessa a fronteira — `null`, booleanos, números,
textos, listas e objetos ([0004](0004-testes-como-dados.md)).

Ele é um arquivo `.java` de verdade em `templates/`, compilado e conferido pelo compilador
do Java a cada build, como os outros templates ([0042](0042-templates-como-arquivos-da-linguagem.md)).

## Consequências

- A execução continua sendo **um comando e nenhuma dependência**: `java Harness.java`, sem
  classpath, sem jar, sem resolver nada em rede ([0023](0023-java-roda-do-fonte.md)).
- É código nosso para manter, e o limite é claro: ele não é uma biblioteca de JSON, é o
  suficiente para o envelope. Números inteiros voltam como `Long` e o resto como `Double`,
  que é a mesma distinção que as outras linguagens fazem.
- Structs do sistema de tipos neutro viram **records**, e o escritor os serializa por
  reflexão sobre os componentes — sem isso, cada struct novo pediria código gerado a mais.
- Se algum dia o jogo precisar de JSON além do envelope, essa decisão se revê.

## Alternativas descartadas

- **Empacotar Jackson ou Gson:** menos código nosso, ao custo de um jar no diretório de
  trabalho, classpath para montar e uma dependência de terceiros dentro do processo do
  jogador — num adapter cujo valor é não precisar de nada.
- **Trocar o protocolo por algo mais fácil de ler em Java:** resolveria um problema de uma
  linguagem quebrando o contrato de todas.
