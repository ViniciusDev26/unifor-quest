# 0024 — Runtimes embutidos entram podados ao mínimo

- Status: aceita
- Data: 2026-09-22

## Contexto

A [ADR 0021](0021-runtimes-empacotados-no-instalador.md) colocou os runtimes dentro do
instalador, e com isso cada linguagem suportada passou a ter um peso em disco. Toolchains
completos trazem muita coisa que um jogo que compila e roda uma função não usa:
documentação, testes, ferramentas de desenvolvimento, módulos inteiros da biblioteca
padrão.

## Decisão

**Todo runtime embutido entra com o mínimo necessário para compilar e executar o código do
jogador.** Vale para Java, Go e qualquer linguagem que venha depois.

- **Java:** `jlink` com `java.base` + `jdk.compiler`, e nada além
  ([ADR 0023](0023-java-roda-do-fonte.md)).
- **Go:** sem `test/`, `api/` e `doc/`. `src/` e `pkg/tool` ficam, porque desde o Go 1.20 a
  biblioteca padrão é compilada sob demanda
  ([ADR 0022](0022-go-versao-cache-e-cgo.md)).

A direção padrão é **adicionar depois, se faltar** — não embutir por precaução.

## Consequências

- O instalador cresce o mínimo possível por linguagem, o que mantém a
  [ADR 0021](0021-runtimes-empacotados-no-instalador.md) viável à medida que o projeto
  ganha linguagens.
- **Um módulo ou pacote ausente vira erro de compilação que o jogador não entende.** O
  adapter precisa reconhecer esse caso e responder com algo melhor do que o erro cru do
  toolchain ([ADR 0005](0005-adapter-por-linguagem.md)).
- **A máquina de desenvolvimento tem o toolchain completo, então a poda só falha no pacote
  final.** A suite de conformance precisa rodar contra o **runtime podado**, não contra o
  toolchain do `mise`, ou o furo aparece na mão do jogador
  ([ADR 0015](0015-validar-com-typescript-e-java.md)).
- Cada ampliação futura é uma decisão consciente, com um nome e um motivo, em vez de
  volume herdado.
- `java.base` cobre collections, streams, `java.time`, `Math` e regex — na prática, quase
  tudo que um desafio de algoritmo precisa. O limite é conhecido e pode ser testado.

## Alternativas descartadas

- **Embutir o toolchain completo:** simples e sem surpresa para o jogador, ao custo de
  carregar em todo instalador o que nenhum desafio usa, multiplicado por linguagem.
- **Decidir caso a caso, por linguagem:** sem regra padrão, cada linguagem nova vira uma
  negociação, e a tendência é sempre incluir "por garantia".
