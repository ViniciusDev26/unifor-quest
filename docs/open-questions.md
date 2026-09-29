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

## 2. Formato do save

O **gatilho** já está decidido: autosave a cada quest concluída
([ADR 0020](decisions/0020-autosave-por-quest.md)). Falta decidir o resto.

- **O que entra:** o código por quest e por linguagem já está decidido que entra
  ([ADR 0030](decisions/0030-qualquer-linguagem-e-replay-livre.md)), junto com flags e
  progressão. Falta o detalhe do formato.
- **Formato:** provavelmente JSON validado com Zod, mas não está decidido. O local já
  está: `userData` ([ADR 0026](decisions/0026-diretorio-de-trabalho-e-save.md)).
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
resto da Fase B — os seis interiores restantes e o conteúdo de quest seguem com a arte que
existe hoje.




## 6. As mecânicas da história

A [história](story.md) traz mecânicas que ainda não têm decisão técnica. Cada item vira
ADR quando for resolvido.

- **Stubs sabotados pelo NULL:** o stub é gerado pelo adapter
  ([ADR 0005](decisions/0005-adapter-por-linguagem.md)). Código com defeito escrito à mão
  para cada linguagem custaria quests × linguagens, que é o que a
  [ADR 0003](decisions/0003-multi-linguagem-custo-por-adapter.md) proíbe. Em aberto:
  descrever o defeito como dado neutro e deixar o adapter gerar, limitar a sabotagem a algo
  que já é neutro (casos de teste, enunciado, dados de entrada), ou aceitar como exceção
  rara, no espírito dos `customTests` ([ADR 0007](decisions/0007-valvula-de-escape-custom-tests.md)).
  É o item de maior risco desta lista.
- **O NULL reagindo ao resultado:** as falas dependem do `ops` e de quanto a solução passou
  perto do limite. Falta decidir onde moram os limiares (na quest, como dado) e como a
  reação chega à cena, já que hoje o `Effect` só tem `setFlag`
  ([ADR 0034](decisions/0034-vocabulario-de-effect-e-prerequisitos.md)).
- **O duelo de operações:** a barra de vida do NULL é um orçamento de `ops`. O `ops` só é
  contado dentro do `Graph` ([ADR 0054](decisions/0054-prelude-graph-e-contagem.md)), mas o
  duelo de busca binária contra busca linear é sobre uma lista. Cada estrutura contada nova
  precisa dizer o que conta como operação ([ADR 0011](decisions/0011-metricas-por-contagem-de-operacoes.md))
  e custa uma mudança em todos os adapters.
- **Consequência que precisa de rastro:** "estantes se reorganizam na ordem das trocas"
  pede a sequência de trocas, não só a lista ordenada. Em aberto: o desafio retornar as
  trocas (muda a assinatura e o enunciado) ou a estrutura contada registrá-las.
- **O efeito de rota:** a forma do `Effect` que consome o retorno do desafio, exigida pela
  [ADR 0060](decisions/0060-rota-volta-quando-o-jogador-nao-poderia-andar.md).
- **Campus em dois estados:** tiles corrompidos e restaurados, e áreas intransitáveis
  enquanto estão corrompidas. Em aberto: dois `.tmj` por mapa, camadas alternadas no mesmo
  mapa ou troca de tileset por flag, e como isso entra na geração da
  [ADR 0058](decisions/0058-mapas-gerados-sem-autotile.md).
- **Ajuda gradual e XP:** não existe XP no `Progress`, nem dica no schema da `Quest`. Falta
  decidir o formato das dicas (por quest e neutras de linguagem, pela 0003) e quanto cada
  degrau custa.
- **Nome e aparência do jogador:** entram no save (questão 2) e numa tela de criação que
  ainda não existe.
- **Pós-jogo e Sala 404:** como o jogo segue depois do final, com o NULL como aliado, e o
  que libera a sala.
- **Um dia, da manhã à noite:** se a hora do dia avança por ato e muda iluminação ou mapa,
  ou fica só no texto.
