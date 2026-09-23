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

O **gatilho** já está decidido: autosave a cada quest concluída
([ADR 0020](decisions/0020-autosave-por-quest.md)). Falta decidir o resto.

- **O que entra:** flags de quest, progressão, e o código escrito pelo jogador por quest
  e por linguagem?
- **Formato e local:** provavelmente JSON validado com Zod, em `app.getPath('userData')`,
  mas nada disso está decidido.
- **Versionamento:** como carregar um save escrito por uma versão anterior do jogo.
- **Um save ou vários:** sem save manual, não há slot escolhido pelo jogador; resta
  decidir se existe mais de um.
- **Código de quest não concluída:** o autosave dispara na conclusão, então o código de
  uma quest em andamento se perde ao fechar o jogo. Isso é aceitável ou precisa de um
  rascunho persistido à parte?

Relacionado: sem sandbox ([ADR 0010](decisions/0010-sem-docker.md)), um save vindo de
terceiros não pode ser tratado como conteúdo confiável.

## 4. JavaScript como linguagem suportada

O [briefing](briefing.md) lista as linguagens iniciais como
**TypeScript, JavaScript, Java e Go**, mas a estrutura planejada do monorepo só prevê
`lang-typescript`, `lang-java` e `lang-go`.

Em aberto: JavaScript é um adapter próprio, um modo do adapter de TypeScript, ou sai da
lista? Não afeta o MVP, que é TypeScript, Java e Go
([ADR 0016](decisions/0016-go-no-mvp.md)).

