# 0062 — Menu inicial, pausa e trilha sonora

- Status: aceita
- Data: 2026-10-01

## Contexto

A [0061](0061-jogo-comeca-na-portaria.md) fez o jogo abrir direto dentro da portaria. Faltava
uma tela de título de verdade antes disso — o pedido era um menu 2D navegável por teclado
(setas + Enter) e mouse, com "Iniciar novo jogo" e "Carregar jogo", e o nome do jogo escrito
de um jeito estilizado. Faltava também trilha sonora e efeitos sonoros: o GDD já documentava
uma curadoria de faixas e SFX CC0 (seção 5), mas nada estava ligado ao jogo rodando.

Depois de implementar as duas coisas, surgiu um terceiro pedido: um menu de pausa dentro do
jogo, aberto com Esc, com "Continuar" (fecha o menu) e "Voltar ao menu inicial". Isso esbarra
de frente no Esc que já existia: na `entrada`, Esc só levava ao campus se `minimapa-liberado`
estivesse nos flags (0061); na `biblioteca`, Esc levava direto ao campus. Duas ações não cabem
numa tecla só — e a escolha, confirmada com o time, foi: **Esc é sempre a pausa**, em toda
cena de gameplay; sair de um cômodo deixa de ser uma tecla solta e ganha um lugar físico no
cenário: uma porta.

## Decisão

- **O menu é a cena de boot de verdade.** `menu-scene.ts` entra primeiro no array `scene` do
  `Phaser.Game` (`main.ts`), antes de `entrada`. `entrada` continua sendo onde a história
  começa (0061) — o menu é mais um passo antes dela, não uma substituição.
- **"Iniciar novo jogo"** chama `this.scene.start('entrada')`. **"Carregar jogo"** aparece
  desabilitada, rotulada "(em breve)": não existe save em disco ainda (`Progress` é só
  memória, `docs/open-questions.md` #2 não está decidido) — mostrar desabilitada é o estado
  honesto da funcionalidade, não uma promessa do formato futuro.
- **Sistema de áudio, sem biblioteca nova:** o `SoundManager` nativo do Phaser já é
  compartilhado por todas as cenas de um mesmo `Phaser.Game` — `audio/music.ts` só evita
  reiniciar a faixa quando a chave não muda entre trocas de cena. Para UI que vive fora de
  uma cena do Phaser (o quest panel é overlay de DOM, não um `GameObject`), `audio/clip.ts`
  usa um `Audio` de DOM simples, sem estado compartilhado — um efeito de tiro só.
- **Esc é o menu de pausa, em toda cena de gameplay** (`menu`, `entrada`, `campus`,
  `biblioteca`, `world`) — `pause-menu.ts`, um módulo só, chamado de `createPauseMenu(scene,
  { isBlocked? })` em cada `create`. "Continuar" fecha o overlay; "Voltar ao menu inicial"
  chama `scene.scene.start('menu')`, reiniciando o plano de cenas pela cena de título em vez
  de tentar desmontar o estado da cena atual pedaço por pedaço. `isBlocked` existe só para a
  `entrada`: a caixa de diálogo do Marcos não pode ser interrompida pela pausa no meio da
  fala.
- **Sair de um cômodo é uma porta, não mais uma tecla.** `door.ts` desenha um marcador visível
  (retângulo + rótulo) num ponto do cenário; `isNearDoor` mede a distância, igual
  `isNearNpc` (`npc.ts`) já fazia para conversas. Em `biblioteca`, chegar perto da porta e
  apertar E volta para `campus`. Em `entrada`, o mesmo E perto da porta decide: se
  `canLeave()` for verdadeiro, vai para `campus`; senão, mostra a mesma fala do Marcos que
  antes aparecia ao apertar Esc sem o flag — a regra da 0061 não mudou, só a tecla que a
  aciona.

## Consequências

- Esc tem um único significado em todo o jogo: pausa. Nenhuma cena usa Esc para outra coisa.
- Toda cena de gameplay precisa pré-carregar o áudio da pausa
  (`preloadPauseMenuAudio`) e chamar `createPauseMenu` no `create` — um módulo a mais para
  lembrar ao criar uma cena nova, documentado aqui para não virar regra tácita.
- Interiores futuros (os seis que faltam, 0058) seguem o mesmo padrão de porta: um
  `createDoor` por saída, sem inventar um mecanismo novo por cenário.
- Nenhuma mudança em `core`: pausa, porta e menu são só Phaser/DOM, `apps/game` (0027).

## Alternativas descartadas

- **Esc pausa só onde Esc não fazia nada antes** (campus, world) e a `entrada`/`biblioteca`
  mantêm o Esc de sair: descartada por criar duas semânticas para a mesma tecla dependendo
  da cena — o jogador não tem como adivinhar qual vale em cada lugar.
- **Pausa em outra tecla (ex. "P"), Esc continua saindo**: descartada porque Esc é a
  expectativa universal de "menu de pausa" em jogos 2D; reservar Esc para sair é que é a
  escolha incomum.
