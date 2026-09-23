# 0045 — Tamanho do pacote não é restrição, por enquanto

- Status: aceita
- Data: 2026-09-23
- Suspende: [0024](0024-runtimes-podados-ao-minimo.md)

## Contexto

A [0024](0024-runtimes-podados-ao-minimo.md) mandava embutir cada runtime podado ao mínimo,
para que o instalador não crescesse sem controle à medida que o projeto ganhasse linguagens.
Ela custava: o `jlink` mínimo decide **quanta biblioteca padrão o jogador pode usar**
([0023](0023-java-roda-do-fonte.md)), e um módulo ausente vira erro de compilação que o
jogador não entende.

Somando toolchain de Go, JDK, `gopls` de 43 MB e depois o `jdtls`, a conta assusta. Mas o
projeto é um jogo de disciplina, distribuído para poucas pessoas, e **nada hoje depende do
instalador ser pequeno**.

## Decisão

**O tamanho do pacote não é uma restrição de projeto.** Dois gigabytes é aceitável.

Na prática:

- runtimes entram **completos**, sem poda — inclusive a biblioteca padrão inteira;
- servidores de linguagem entram sem ponderar o peso deles
  ([0044](0044-ponte-lsp-propria.md));
- medir o tamanho por plataforma deixa de ser pré-requisito para decidir qualquer coisa.

Isso **suspende** a [0024](0024-runtimes-podados-ao-minimo.md), não a apaga: a regra e o
raciocínio dela continuam válidos se um dia o tamanho voltar a importar.

## Consequências

- **O jogador ganha a biblioteca padrão inteira.** Some a classe de falha "módulo podado
  demais", que era o pior efeito da 0024 porque acontecia só no pacote final e na mão do
  jogador.
- A conformance não precisa mais rodar contra um runtime podado
  ([0028](0028-vitest-como-runner-de-testes.md)); rodar contra o runtime completo passa a
  ser a mesma coisa.
- A questão de empacotamento encolhe para o que não é tamanho: empacotador, assinatura e
  notarização no macOS, Apple Silicon e formato no Linux.
- **O que continua valendo, e não é sobre tamanho:** o `GOCACHE` pré-aquecido
  ([0022](0022-go-versao-cache-e-cgo.md)) é sobre a primeira execução ser rápida, e o
  cuidado com o Windows Defender ([0026](0026-diretorio-de-trabalho-e-save.md)) é sobre o
  tempo de cada execução. Nenhum dos dois melhora com um pacote menor.
- Build e publicação ficam mais lentos, e o download inicial do jogador, maior.

## Alternativas descartadas

- **Manter a poda por disciplina:** economizaria bytes que ninguém está contando, ao custo
  de decidir hoje quanta biblioteca padrão o jogador pode usar — uma decisão de gameplay
  tomada por um motivo de logística.
