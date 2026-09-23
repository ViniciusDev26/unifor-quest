# Questões em aberto

Decisões ainda **não** tomadas. Quando uma delas for resolvida, ela vira um ADR em
[decisions/](decisions/) e sai daqui.

## 1. Backend de execução

Como o código do jogador roda, por trás da interface `Executor`
([ADR 0009](decisions/0009-execucao-no-main-process.md)).

**Opção A — runtimes empacotados localmente no Electron**

- o jogo funciona offline e sem depender de servidor;
- aumenta muito o tamanho do instalador;
- o Windows Defender é lento com executáveis gerados em diretório temporário, o que afeta
  diretamente o tempo de cada execução.

**Opção B — executor remoto self-hosted, tipo Piston**

- instalador pequeno, e adicionar linguagem não mexe no cliente;
- exige container privilegiado;
- depende de o servidor estar no ar, o que é um problema para um jogo de disciplina.

A interface `Executor` existe para que essa escolha possa ser adiada e trocada.

## 2. Empacotamento dos runtimes de Java e Go

Se a opção A for escolhida, como distribuir o **Java** — por exemplo um JDK reduzido via
`jlink`, incluindo `jdk.compiler`, já que o jogo precisa **compilar**, não só executar.

A mesma pergunta vale para o **toolchain de Go**, que entrou no MVP pela
[ADR 0016](decisions/0016-go-no-mvp.md) e também compila antes de executar.

Impacta diretamente o tamanho do instalador e os passos 5 e 6 do
[roadmap](roadmap.md).

## 3. Formato do save

Ainda não definido. O que precisa ser respondido: o que entra no save (flags de quest,
progressão, código escrito por quest e por linguagem), em que formato, onde fica no disco
e como lidar com saves de versões antigas.

Relacionado: sem sandbox ([ADR 0010](decisions/0010-sem-docker.md)), um save vindo de
terceiros não pode ser tratado como conteúdo confiável.

## 4. JavaScript como linguagem suportada

O [briefing](briefing.md) lista as linguagens iniciais como
**TypeScript, JavaScript, Java e Go**, mas a estrutura planejada do monorepo só prevê
`lang-typescript`, `lang-java` e `lang-go`.

Em aberto: JavaScript é um adapter próprio, um modo do adapter de TypeScript, ou sai da
lista? Não afeta o MVP, que é TypeScript, Java e Go
([ADR 0016](decisions/0016-go-no-mvp.md)).

## 5. Validação em runtime no `core`

A [ADR 0017](decisions/0017-type-safety-total.md) exige que todo dado externo seja
validado antes de virar um tipo. Isso precisa morar em `packages/core`, que pela regra de
dependência **não depende de nada**.

Em aberto: escrever os validadores à mão (mantém a regra, custa código repetitivo e
arrisca divergir dos tipos) ou adotar uma lib de schema e passar a ler a regra como
"`core` não depende de outros pacotes do monorepo"?

Precisa ser resolvido no passo 1 do [roadmap](roadmap.md).
