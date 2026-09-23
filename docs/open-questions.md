# Questões em aberto

Decisões ainda **não** tomadas. Quando uma delas for resolvida, ela vira um ADR em
[decisions/](decisions/) e sai daqui.

## 1. Empacotamento dos runtimes de Java e Go

A [ADR 0021](decisions/0021-runtimes-empacotados-no-instalador.md) decidiu embutir os
runtimes no instalador. Falta decidir **como**.

- **Java:** Temurin 25 LTS, rodando direto do fonte
  ([ADR 0023](decisions/0023-java-roda-do-fonte.md)). Falta decidir **quais módulos
  entram no `jlink` além do mínimo** (`java.base` + `jdk.compiler`) — o que define, na
  prática, quanta biblioteca padrão o jogador pode usar. `java.base` já cobre
  collections, streams, `java.time`, `Math` e regex; módulo faltando vira erro de
  compilação que o jogador não entende.
- **Go:** versão, cache pré-aquecido e `CGO_ENABLED=0` já estão decididos
  ([ADR 0022](decisions/0022-go-versao-cache-e-cgo.md)). Falta o que dá para podar do
  toolchain: `test/`, `api/` e `doc/` saem, mas `src/` é obrigatório desde o Go 1.20,
  porque a stdlib é compilada sob demanda.
- **Tamanho:** precisa ser **medido** antes de qualquer conclusão sobre viabilidade.
- **Diretório de trabalho:** os arquivos gerados vão para pasta temporária do sistema ou
  para um diretório estável em `userData`? Binário recém-criado é inspecionado pelo
  Windows Defender, e isso entra no tempo de cada execução. O `GOCACHE` pré-aquecido da
  [ADR 0022](decisions/0022-go-versao-cache-e-cgo.md) já precisa de um destino gravável,
  então essa decisão está praticamente forçada para o lado do diretório estável.

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

