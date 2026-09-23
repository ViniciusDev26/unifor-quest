# 0005 — Adapter por linguagem

- Status: aceita
- Data: 2026-09-22

## Contexto

O desafio é dado neutro ([0004](0004-testes-como-dados.md)), mas o jogador escreve e roda
código real. Alguém precisa fazer a ponte entre os dois, uma vez por linguagem.

## Decisão

Cada linguagem tem um **adapter**, responsável por:

- mapear os tipos neutros para os tipos da linguagem;
- gerar o **stub** que o jogador vê no editor;
- gerar o **harness** que roda os testes;
- fornecer o **prelude** (ex.: `Graph` instrumentado);
- converter erros do compilador em **diagnostics** para o Monaco.

**Arquivos gerados nunca são editados à mão.**

## Consequências

- O adapter é o único lugar com conhecimento de sintaxe de uma linguagem.
- Templates de código de outra linguagem (ex.: Java) vivem dentro do pacote do adapter.
- Parsear a saída de erro de cada compilador é trabalho por linguagem, e é onde mora a
  maior parte do esforço de um adapter novo.

## Alternativas descartadas

- **Stub e harness escritos à mão por quest:** viola [0003](0003-multi-linguagem-custo-por-adapter.md).
