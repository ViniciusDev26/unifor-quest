# 0044 — Ponte LSP própria, no Monaco oficial

- Status: aceita
- Data: 2026-09-23

## Contexto

Monaco conhece Go só o suficiente para colorir palavras. Sem servidor de linguagem, o
jogador escreve Go sem completar nada, sem ver a biblioteca padrão e sem erro até apertar
Executar.

O caminho conhecido é a extensão oficial do Go do VS Code — que **não existe para Monaco**:
Monaco é o widget de edição extraído do VS Code, sem host de extensões. E aquela extensão é,
na prática, uma casca fina em volta do `gopls`, que é onde está a inteligência.

A biblioteca usual para ligar Monaco a um servidor, `monaco-languageclient`, reaproveita o
cliente do próprio VS Code. Para isso ela **não usa `monaco-editor`**: depende de
`@codingame/monaco-vscode-editor-api`, uma substituição do Monaco compilada do código do VS
Code, mais um shim dos serviços. Adotá-la significa trocar o editor e ficar preso à linha de
versão deles.

## Decisão

**Uma ponte nossa, mantendo o `monaco-editor` oficial.**

- `packages/lsp` fala JSON-RPC com o servidor por stdio: só enquadramento, em `framing.ts`,
  e o processo, em `host.ts`. Nada ali sabe o que é uma completação.
- O **main** sobe o servidor e roteia mensagens; o **renderer** é o cliente de verdade, com
  o handshake, a sincronização do documento e a correlação de requisições.
- Os pontos de extensão do Monaco fazem o resto:
  `setModelMarkers`, `registerCompletionItemProvider`, `registerHoverProvider`,
  `registerSignatureHelpProvider`, `registerDocumentFormattingEditProvider` e
  `registerCodeActionProvider` — este último é a lâmpada e o `Ctrl+.`.
- **Os imports são organizados antes de executar.** Go recusa compilar um arquivo que
  importa um pacote que não usa, então um auto-import que ficou para trás depois de o
  código mudar vira um erro de compilação que o jogador não escreveu. Todo editor de Go
  resolve isso rodando `goimports` ao salvar; o jogo não tem salvar, e o momento
  equivalente é o clique em Executar. Quem decide o que fazer é o servidor: uma linguagem
  cujo servidor não ofereça essa ação simplesmente não recebe nada.
- **Auto-import sai da completação**, não de um recurso à parte: uma completação pode vir
  com `additionalTextEdits`, edições em outro ponto do arquivo. É ali que o servidor manda
  o `import "fmt"` quando o jogador aceita `fmt.Println` sem ter importado o pacote.
  Ignorar esse campo é a diferença entre auto-import funcionar e não funcionar.
- A porta `LanguageAdapter` ganha um `languageServer?` **opcional**: é conhecimento por
  linguagem, como o toolchain já era ([0005](0005-adapter-por-linguagem.md)).
- **TypeScript não tem entrada.** Monaco já embute um serviço completo de TypeScript num
  worker, melhor do que qualquer coisa que a ponte faria.
- O editor mostra o **estado do servidor** — iniciando, pronto, parado, falhou. Sem isso,
  "o servidor não está rodando" e "seu código está sem erros" são a mesma tela em branco.

## Consequências

- O jogo continua no `monaco-editor` oficial, sem fork e sem acoplamento de versão.
- A ponte é agnóstica: **a mesma serve Java** com `jdtls`, porque fala LSP e não Go.
- O que a gente escreve é o subconjunto que o jogo usa. O que sobra é o que um editor de
  desafios não precisa — refatoração em massa, workspace com muitos arquivos, renomear
  símbolo entre arquivos.
- O trabalho real da ponte é a tradução: LSP conta linha e coluna a partir de zero, Monaco a
  partir de um, e as numerações de severidade e de tipo de completação não coincidem.
- Um servidor pode responder com o título de uma ação e **sem** as edições, esperando uma
  segunda volta (`codeAction/resolve`, `completionItem/resolve`) antes de se comprometer. A
  ponte faz essa segunda volta; sem ela, a lâmpada aparece e não faz nada.
- As edições vêm endereçadas ao arquivo em disco que o servidor observa, enquanto o Monaco
  endereça o próprio modelo em memória. A ponte filtra o que é do nosso documento e
  reaponta para o modelo.
- O documento é sincronizado **inteiro** a cada mudança, com um atraso de 400 ms. É mais
  simples que sincronização incremental e sobra para um arquivo do tamanho de uma quest.
- **O `gopls` tem 43 MB**, somados ao toolchain. Deixou de ser um problema com a
  [0045](0045-tamanho-do-pacote-nao-e-restricao.md), que tirou o tamanho do pacote da lista
  de restrições.
- Um servidor é um processo a mais para iniciar, vigiar e encerrar. Ele sobe sob demanda, na
  primeira vez que a linguagem é aberta, porque indexar a biblioteca padrão custa segundos.

## Alternativas descartadas

- **`monaco-languageclient`:** menos código nosso e protocolo inteiro, ao custo de trocar o
  Monaco pelo fork, de um shim dos serviços do VS Code e de muito bundle — para um editor
  que abre uma função por vez.
- **Só marcar os erros do compilador**, sem servidor: quase de graça, e não dá
  autocompletar nem navegação pela biblioteca padrão, que é justamente o que falta em Go.
- **Instalar a extensão do VS Code:** não existe onde instalar.
