# 0010 — Sem Docker

- Status: aceita
- Data: 2026-09-22

## Contexto

Plataformas que executam código de terceiros normalmente isolam tudo em container. Aqui a
situação é outra: o jogador roda **o próprio código, na própria máquina**.

## Decisão

**Sem Docker.**

O risco real a mitigar é **loop infinito, consumo de memória e processos órfãos**, não
código malicioso. Esses riscos são tratados pelos timeouts e pelo encerramento da árvore
de processos ([0009](0009-execucao-no-main-process.md)).

## Consequências

- A distribuição no Windows fica muito mais simples: sem dependência de container.
- Não há isolamento de sistema de arquivos ou de rede; o código do jogador tem os mesmos
  poderes que qualquer programa que ele rodasse no terminal.
- Um save compartilhado por terceiros não pode ser tratado como conteúdo confiável.

## Alternativas descartadas

- **Container por execução:** isolamento real, mas Docker no Windows complicaria demais a
  distribuição, para proteger o jogador de si mesmo.
