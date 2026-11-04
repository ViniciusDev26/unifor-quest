# Questões em aberto

Decisões ainda **não** tomadas. Quando uma delas for resolvida, ela vira um ADR em
[decisions/](decisions/) e sai daqui.

## 1. Empacotamento e distribuição

Decidido: runtimes embutidos ([ADR 0021](decisions/0021-runtimes-empacotados-no-instalador.md)),
completos, sem poda ([ADR 0045](decisions/0045-tamanho-do-pacote-nao-e-restricao.md)), em
Windows, Linux e macOS ([ADR 0025](decisions/0025-suporte-a-linux-e-macos.md)). O que falta
não é tamanho:

- **Empacotador:** electron-builder ou electron-forge, e como os runtimes entram como
  recurso externo, fora do `asar`.
- **macOS:** assinatura e notarização de cada binário embutido, e quais entitlements o
  hardened runtime exige para rodar uma JVM e executar um binário recém-compilado. É o
  ponto de maior risco técnico do empacotamento.
- **Apple Silicon:** build arm64 separado ou universal.
- **Formato no Linux:** AppImage, `.deb` ou tarball. Formatos com sandbox (Snap, Flatpak)
  restringem spawn de processos e escrita de executáveis, que é o funcionamento normal do
  jogo.

Impacta os passos 5 e 6 do [roadmap](roadmap.md).

## 2. ~~Formato do save~~

Resolvido na [ADR 0072](decisions/0072-formato-do-save.md): JSON validado por Zod, com
`version` e migrações em `core`; um save só; código por quest e linguagem; o código não
concluído vai para um rascunho à parte, gravado ao fechar o editor.

## 3. ~~JavaScript como linguagem suportada~~

Resolvido na [ADR 0073](decisions/0073-javascript-fora-das-linguagens.md): JavaScript sai da
lista de linguagens do jogo.

## 4. Cache do ElixirLS pré-aquecido no empacotamento

A primeira execução do ElixirLS busca rede para compilar as próprias dependências
([ADR 0057](decisions/0057-elixir-ls-sem-o-launcher-oficial.md)). Em desenvolvimento isso
acontece uma vez e fica em cache; um build empacotado precisa desse cache já pronto e
embutido, do mesmo jeito que o `GOCACHE` do Go é semeado a partir do bundle
([ADR 0022](decisions/0022-go-versao-cache-e-cgo.md)).

Em aberto: em que etapa do empacotamento esse cache é gerado (CI, ou uma máquina de
desenvolvimento, versionado como artefato), e onde ele mora dentro do instalador. Junto com
isso, o próprio Erlang/OTP entra como um **segundo runtime** por trás do Elixir — os dois
precisam ser resolvidos e postos no `PATH` um do outro, diferente de Go, Java, Python e Node,
onde um executável carrega o runtime inteiro. Impacta o mesmo passo do
[roadmap](roadmap.md) que a questão 1.

## 5. Arte de verdade para os prédios do campus

Os prédios do campus (0058) hoje são stamps genéricos de um pacote de vilarejo de fantasia
(`assets/graphics/graphics/objects/`) — funcionam (nome, colisão, escala corretos), mas não
se parecem com a Unifor nem com prédio nenhum de verdade. A busca por alternativa achou:

- **Lo-Bit City** (Greywyrd, grátis): tentado para os prédios em si e descartado — as peças
  são de cidade genérica, sem instituição nenhuma, e ficam rasas mesmo com janela composta
  por cima. Ficou só o chão (concreto/asfalto), que funcionou bem.
- **Modern University Pixel Art Tileset** (comshadow, US$ 3,99): bate certinho — biblioteca
  com cúpula e colunas, ginásio com quadra, blocos acadêmicos com fileiras de janela, mais
  mobília de interior pronta para quando as salas existirem. É pago e gerado por IA; a
  decisão de comprar (ou não) foi adiada.

Em aberto: pagar por esse pacote, esperar aparecer um gratuito à altura, ou aceitar os
stamps de fantasia como estética definitiva do jogo em vez de placeholder. Não bloqueia o
resto da Fase B — os interiores que faltam e o conteúdo de quest seguem com a arte que
existe hoje.




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
