# 0053 — Pyright como servidor de linguagem de Python

- Status: aceita
- Data: 2026-09-23

## Contexto

Python precisa de servidor de linguagem pelo mesmo motivo que Go e Java
([0044](0044-ponte-lsp-propria.md)): sem ele, o Monaco colore palavras e não sabe mais nada.

Os candidatos se dividem em dois grupos. `pylsp` e `jedi-language-server` são programas
Python, e rodariam no interpretador que o jogo vai embutir de qualquer jeito. **Pyright** é
um programa **Node**.

## Decisão

**Pyright**, executado pelo Node que o Electron já carrega — o mesmo truque que faz o
TypeScript custar zero ([0021](0021-runtimes-empacotados-no-instalador.md)):

```text
<electron> --stdio <node_modules>/pyright/langserver.index.js    com ELECTRON_RUN_AS_NODE=1
```

## Consequências

- **O servidor de linguagem de Python não custa runtime nenhum.** Java precisou da JVM que o
  jogo já tinha ([0051](0051-jdtls-sem-python.md)); Python nem isso.
- Pyright traz os próprios stubs da biblioteca padrão (typeshed), então completação e
  verificação de tipos funcionam sem precisar apontar um interpretador.
- Ele é o verificador de tipos mais rigoroso do ecossistema Python, e aqui isso é bom: o
  jogador vê `Type "Literal[42]" is not assignable to return type "str"` antes de executar.
- Pyright entra como dependência do app. Atualizá-lo é rotina de npm, não de empacotamento.

## Alternativas descartadas

- **`pylsp` ou `jedi`:** rodariam no Python embutido, sem custo extra de runtime também, mas
  são mais lentos e menos rigorosos na verificação de tipos — e a rigidez é o que faz o erro
  aparecer no editor em vez de na execução.
