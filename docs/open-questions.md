# Questões em aberto

Decisões ainda **não** tomadas. Quando uma delas for resolvida, ela vira um ADR em
[decisions/](decisions/) e sai daqui.

## 1. Empacotamento e distribuição

Decidido: runtimes embutidos ([ADR 0021](decisions/0021-runtimes-empacotados-no-instalador.md)),
podados ao mínimo ([ADR 0024](decisions/0024-runtimes-podados-ao-minimo.md)), em Windows,
Linux e macOS ([ADR 0025](decisions/0025-suporte-a-linux-e-macos.md)). O que falta:

- **Empacotador:** electron-builder ou electron-forge, e como os runtimes entram como
  recurso externo, fora do `asar`.
- **macOS:** assinatura e notarização de cada binário embutido, e quais entitlements o
  hardened runtime exige para rodar uma JVM e executar um binário recém-compilado. É o
  ponto de maior risco técnico do empacotamento.
- **Apple Silicon:** build arm64 separado ou universal, que dobra o peso dos runtimes.
- **Formato no Linux:** AppImage, `.deb` ou tarball. Formatos com sandbox (Snap, Flatpak)
  restringem spawn de processos e escrita de executáveis, que é o funcionamento normal do
  jogo.
- **Tamanho:** precisa ser **medido** por plataforma, depois da poda — não estimado.

Impacta os passos 5 e 6 do [roadmap](roadmap.md).

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

