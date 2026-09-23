# 0023 — Java roda direto do fonte, sem compilar para `.class`

- Status: aceita
- Data: 2026-09-22

## Contexto

O fluxo clássico de Java no [`Executor`](0009-execucao-no-main-process.md) seria
`javac` → `.class` → `java`: duas etapas, com timeout separado, e arquivos novos gravados
em disco a cada rodada. Esses arquivos são exatamente o que o Windows Defender inspeciona,
e isso entra no tempo que o jogador espera depois de apertar "Executar"
([ADR 0021](0021-runtimes-empacotados-no-instalador.md)).

Desde o JDK 22 (JEP 458), o launcher roda **programas de múltiplos arquivos direto do
fonte**, compilando em memória.

## Decisão

**O adapter de Java executa `java Main.java`.** Não há etapa de compilação separada nem
`.class` gravado em disco.

Isso fixa duas coisas que dependiam desta:

- **JDK 22 ou superior** é requisito, não preferência. Adotamos **Temurin 25 LTS**, a LTS
  corrente.
- O `jlink` precisa incluir, no mínimo, **`java.base` + `jdk.compiler`** — o compilador
  passa a ser parte do runtime distribuído, não uma ferramenta de build. Quanta biblioteca
  padrão além disso o jogador terá continua em aberto, ver
  [../open-questions.md](../open-questions.md).

## Consequências

- **Java deixa de gerar binário novo a cada execução.** O problema do Defender fica
  restrito ao Go, que ainda compila para um executável
  ([ADR 0022](0022-go-versao-cache-e-cgo.md)).
- O `Executor` tem **uma etapa em vez de duas** para Java, e portanto **um timeout só**.
  A interface continua suportando timeouts separados, porque Go ainda compila antes de
  executar — o que muda é o que o adapter de Java usa dela
  ([ADR 0009](0009-execucao-no-main-process.md)).
- O código é **recompilado a cada execução**. O custo é pequeno perto do startup da JVM, e
  a [ADR 0011](0011-metricas-por-contagem-de-operacoes.md) já diz que tempo não é a
  métrica que o jogo mostra.
- O **prelude também é distribuído como fonte** e compilado junto, o que mantém tudo em um
  único formato: nada pré-compilado, nada a versionar em binário.
- Os erros do compilador continuam vindo pelo stderr, com arquivo e linha, para o adapter
  transformar em diagnostics ([ADR 0005](0005-adapter-por-linguagem.md)). O código do
  jogador continua em arquivo próprio, então as linhas batem com as do editor
  ([ADR 0006](0006-protocolo-do-harness.md)).
- O launcher de fonte compila os arquivos **conforme são referenciados**, todos na mesma
  árvore de diretórios, com o arquivo principal primeiro. O gerador do harness precisa
  respeitar esse arranjo.
- **Sem bibliotecas de terceiros.** O jogador tem a biblioteca padrão e nada mais — o que
  já era verdade, mas agora é estrutural.

## Alternativas descartadas

- **`javac` → `.class` → `java`:** o caminho convencional, com compilação separada e cache
  de `.class` quando o código não muda. Em troca, grava binário a cada rodada — o caso
  ruim para o Defender — e adiciona uma etapa ao `Executor` sem benefício visível no jogo.
