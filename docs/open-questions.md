# Questões em aberto

Decisões ainda **não** tomadas. Quando uma delas for resolvida, ela vira um ADR em
[decisions/](decisions/) e sai daqui.

## 1. ~~Empacotamento e distribuição~~

Resolvido por partes. Runtimes embutidos ([ADR 0021](decisions/0021-runtimes-empacotados-no-instalador.md)),
completos, sem poda ([ADR 0045](decisions/0045-tamanho-do-pacote-nao-e-restricao.md)), em
Windows, Linux e macOS ([ADR 0025](decisions/0025-suporte-a-linux-e-macos.md)), baixados com
checksum ([ADR 0082](decisions/0082-runtimes-baixados-com-checksum.md)), e:

- ~~**Empacotador**~~: resolvido na [ADR 0081](decisions/0081-electron-builder.md),
  electron-builder, sem `asar`, com os runtimes em `extraResources`.
- ~~**macOS**~~ e ~~**Apple Silicon**~~: resolvidos na
  [ADR 0084](decisions/0084-macos-sem-assinatura-arm64-e-intel.md). Assinatura ad-hoc, sem
  runtime endurecido nem notarização, e um dmg por arquitetura.
- ~~**Formato no Linux**~~: resolvido na [ADR 0085](decisions/0085-linux-em-appimage.md),
  AppImage.

Impacta os passos 5 e 6 do [roadmap](roadmap.md).

## 2. ~~Formato do save~~

Resolvido na [ADR 0072](decisions/0072-formato-do-save.md): JSON validado por Zod, com
`version` e migrações em `core`; um save só; código por quest e linguagem. O código não
concluído vai para o mesmo save, gravado a cada alteração
([ADR 0078](decisions/0078-autosave-a-cada-alteracao.md)).

## 3. ~~JavaScript como linguagem suportada~~

Resolvido na [ADR 0073](decisions/0073-javascript-fora-das-linguagens.md): JavaScript sai da
lista de linguagens do jogo.

## 4. ~~Cache do ElixirLS pré-aquecido no empacotamento~~

Resolvido na [ADR 0083](decisions/0083-caches-pre-aquecidos-no-instalador.md): o CI compila o
ElixirLS e aquece o `GOCACHE` na própria plataforma, e o instalador leva os dois prontos.

## 5. ~~Arte de verdade para os prédios do campus~~

Resolvido na [ADR 0079](decisions/0079-predios-do-campus-gerados-por-modelo-de-imagem.md):
cada prédio é gerado por um modelo de imagem a partir de um prompt próprio e reduzido a pixel
art por `scripts/campus-buildings.py`.

## 6. As mecânicas da história

A [história](story.md) traz mecânicas que ainda não têm decisão técnica. Cada item vira
ADR quando for resolvido.

- ~~**O duelo de operações**~~ — resolvido na
  [ADR 0068](decisions/0068-duelo-de-operacoes.md): o orçamento é `opsBudget` no
  `Challenge`, a vitória exige ficar dentro dele, e o painel mostra a barra do NULL.
- ~~**As falas do NULL**~~ — resolvido na
  [ADR 0069](decisions/0069-reacao-do-null-ao-resultado.md): uma fala fixa quando o
  jogador acerta fora do orçamento (`dialogue.overBudget`), sem medir a margem.
- ~~**O campus com o NULL e sem ele**~~ — resolvido na
  [ADR 0070](decisions/0070-campus-com-e-sem-null.md): a flag `campus-restaurado` troca a
  música e o filtro verde do campus; o mapa não muda.
- ~~**Davi em dois lugares**~~ — resolvido na
  [ADR 0066](decisions/0066-cutscene-e-dado.md): ele é ator das cutscenes e fica parado na
  portaria durante a conversa com o Marcos, sem conversa própria.

## 7. O jogo cabe em 20 minutos para quem escreve o código?

O [playtest cronometrado](playtest.md) mediu tudo o que o jogo faz sozinho em cerca de
1 min 40 s, e estimou o total entre 18 e 30 minutos. Quase toda a diferença está em
escrever as soluções, sobretudo a árvore da Biblioteca e o Dijkstra do confronto. Falta uma
sessão com quem nunca viu o jogo ([ADR 0064](decisions/0064-jogo-de-ate-20-minutos.md)).
Se essas duas quests passarem muito dos 5 minutos, as opções em aberto são simplificar o
desafio ou deixar o stub entregar mais pronto (por exemplo, a inserção na árvore).
