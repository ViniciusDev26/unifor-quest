# Questões em aberto

Decisões ainda **não** tomadas. Quando uma delas for resolvida, ela vira um ADR em
[decisions/](decisions/) e sai daqui.

## 1. Empacotamento dos runtimes de Java e Go

A [ADR 0021](decisions/0021-runtimes-empacotados-no-instalador.md) decidiu embutir os
runtimes no instalador. Falta decidir **como**.

- **Java:** um JDK reduzido via `jlink` incluindo `jdk.compiler`, já que o jogo precisa
  **compilar**, não só executar. Quais módulos entram?
- **Go:** o toolchain completo é grande e inclui coisas que o jogo não usa (`src`,
  testes). Dá para reduzir com segurança?
- **Tamanho:** precisa ser **medido** antes de qualquer conclusão sobre viabilidade.
- **Diretório de trabalho:** os arquivos gerados vão para pasta temporária do sistema ou
  para um diretório estável em `userData`? Binário recém-criado é inspecionado pelo
  Windows Defender, e isso entra no tempo de cada execução.

Impacta diretamente o tamanho do instalador e os passos 5 e 6 do
[roadmap](roadmap.md).

## 2. Formato do save

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

## 3. JavaScript como linguagem suportada

O [briefing](briefing.md) lista as linguagens iniciais como
**TypeScript, JavaScript, Java e Go**, mas a estrutura planejada do monorepo só prevê
`lang-typescript`, `lang-java` e `lang-go`.

Em aberto: JavaScript é um adapter próprio, um modo do adapter de TypeScript, ou sai da
lista? Não afeta o MVP, que é TypeScript, Java e Go
([ADR 0016](decisions/0016-go-no-mvp.md)).

