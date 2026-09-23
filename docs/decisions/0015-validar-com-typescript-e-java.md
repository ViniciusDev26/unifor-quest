# 0015 — Validar a abstração cedo com TypeScript e Java

- Status: aceita, ampliada pela [0016](0016-go-no-mvp.md)
- Data: 2026-09-22

## Contexto

A abstração de adapter ([0005](0005-adapter-por-linguagem.md)) só prova que funciona se
for exercitada por linguagens que discordam entre si. Duas linguagens parecidas
validariam pouco e deixariam o furo aparecer na terceira.

## Decisão

Implementar primeiro **TypeScript e Java**, duas linguagens bem diferentes — interpretada
e dinâmica contra compilada e estática, sem e com etapa de compilação, tipagem estrutural
contra nominal — antes de adicionar qualquer outra.

Manter uma **suite de conformance** que todo adapter precisa passar antes de entrar no jogo.

> A [0016](0016-go-no-mvp.md) manteve essa ordem, mas trouxe **Go para dentro do MVP**,
> depois de TypeScript e Java.

## Consequências

- O mapeamento de tipos e o protocolo de harness são testados contra dois extremos logo no
  MVP.
- A conformance vira o contrato executável de um adapter, e o roteiro de quem for
  adicionar uma linguagem.
- O MVP fica mais caro: Java traz compilação, empacotamento de JDK e parsing de erro do
  compilador desde o começo.

## Alternativas descartadas

- **Começar só com TypeScript:** o adapter acabaria moldado pela linguagem do próprio jogo,
  e a abstração só seria testada quando já fosse cara de mudar.
