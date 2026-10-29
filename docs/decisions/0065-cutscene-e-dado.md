# 0065 — Cutscene é dado: uma lista de passos que a cena encena

- Status: aceita
- Data: 2026-10-29
- Retoma o que a [0063](0063-hud-de-objetivo-reaproveita-a-cadeia-de-quests.md) adiou

## Contexto

A [história](../story.md) abre e fecha com cenas que o jogador assiste, não joga. Na
abertura, o calouro e o Davi entram na portaria, as telas apagam com `NULL` e o Davi
reinicia o painel de placas. No final, o NULL se desfaz, as telas do campus voltam e o Davi
aparece na porta. Hoje nada disso tem como acontecer: a única coisa que uma cena sabe mostrar
sem o jogador é a caixa de diálogo (`dialogue-box.ts`).

A [0063](0063-hud-de-objetivo-reaproveita-a-cadeia-de-quests.md) deixou cutscenes para
depois. A história limita o tamanho: nada de cutscene longa, e abertura e final somam uns 2
minutos.

Em aberto também estava se o Davi é NPC em cena ou só fala
([open-questions §6](../open-questions.md)). Lida a história, nenhuma cena pede conversa
com ele: toda fala do Davi está dentro da conversa de outro personagem (o Marcos na portaria,
o sucesso do confronto) ou é encenação.

## Decisão

### Cutscene é dado, como quest

Uma cutscene é uma **lista de passos declarativos**, com schema Zod em `core`, pela mesma
razão que quest é dado ([0014](0014-quests-declarativas.md)) e efeito é lista
([0027](0027-arquitetura-em-aneis.md)): o conteúdo fica fora das cenas, e o formato se testa
em Node, sem canvas.

```ts
{
  id: 'abertura',
  scene: 'entrada',
  requires: { quests: [], flags: [] },
  steps: [
    { kind: 'spawn', actor: 'davi', at: { x: 7, y: 12 } },
    { kind: 'move', actor: 'davi', to: { x: 4, y: 6 } },
    { kind: 'cue', name: 'telas-null' },
    { kind: 'wait', ms: 600 },
    { kind: 'say', lines: [{ speaker: 'Davi', text: '...' }] },
  ],
}
```

- `scene` é a chave da cena do Phaser onde a cutscene acontece.
- `requires` tem a mesma forma do da quest ([0034](0034-vocabulario-de-effect-e-prerequisitos.md)).

### Vocabulário fechado de passos

| Passo | O que faz |
| --- | --- |
| `say` | Mostra falas na caixa de diálogo; E avança, como numa conversa. |
| `wait` | Espera `ms` milissegundos. |
| `spawn` / `despawn` | Põe ou tira um ator da cena, numa posição em tiles. |
| `move` | Anda com um ator até uma posição em tiles, com a animação de caminhada. |
| `fade` | Escurece (`out`) ou clareia (`in`) a câmera, em `ms`. |
| `cue` | Pede à cena um efeito visual dela, pelo nome (`telas-null`, `null-se-desfaz`). |

Os passos rodam **em sequência**: cada um termina antes do próximo começar. Igual ao
`Effect`, ampliar o vocabulário é mudança de engine, e a união cresce quando um caso real
pedir.

O `cue` separa o *quando* do *como*, a mesma divisão da 0027: o dado diz em que momento as
telas apagam; a cena decide o que "telas apagando" desenha. Um `cue` que a cena não conhece
é erro de desenvolvedor e falha alto, não some em silêncio.

Posição é **em tiles do mapa da cena**, não em pixels nem em marcadores do mapa: não exige
mexer na geração de mapas da [0058](0058-mapas-gerados-sem-autotile.md), e o tile é a
unidade em que os mapas já são pensados.

### Quando toca

Uma regra pura em `core`, `pendingCutscene(cutscenes, scene, progress)`, devolve a primeira
cutscene daquela cena com `requires` satisfeito e ainda não vista. A cena pergunta em dois
momentos: **ao ser criada** e **sempre que `progress` muda**. Isso cobre os dois casos da
história sem um conceito de gatilho:

- a abertura não exige nada e toca ao entrar na `entrada`;
- o final exige `o-confronto` e toca logo depois da quest, ainda no Bloco de Tecnologia.

### Toca uma vez, sem pular

- **`Progress` ganha `seenCutscenes`**, ao lado de `completedQuests`. Ao terminar, a regra
  `markCutsceneSeen` devolve o progresso novo. Não se usa flag para isso: flag é estado do
  mundo que outras regras leem, e "a cutscene já passou" não é estado do mundo.
- **Não dá para pular.** As cutscenes são curtas e únicas por save.
- **Esc continua pausando** ([0062](0062-menu-inicial-pausa-e-trilha-sonora.md)): a pausa
  congela o tempo e os tweens da cena, então a cutscene para junto.
- Enquanto ela roda, o jogador não anda nem interage, e a HUD de objetivo fica oculta.

### Davi é ator, não NPC

O Davi existe na cena como **ator**: entra, anda e fala nas cutscenes, e fica parado na
portaria enquanto o Marcos explica a cifra, já que fala dentro daquela conversa. Ninguém
conversa com ele, e E perto dele não faz nada. Fecha o item de
[open-questions §6](../open-questions.md).

### Onde cada coisa mora

- `core`: `cutsceneSchema` e os passos; `pendingCutscene` e `markCutsceneSeen`;
  `seenCutscenes` em `Progress`.
- Conteúdo: a cutscene mora no arquivo do lugar, junto da quest (`content/entrada.ts`,
  `content/bloco-de-tecnologia.ts`).
- `apps/game`: `scenes/cutscene-player.ts`, `createCutscenePlayer(scene, { actors, cues,
  dialogueBox })`, que interpreta os passos com tweens, câmera e a caixa de diálogo.

## Consequências

- A abertura e o final viram conteúdo, não código de cena: a cena só registra seus atores e
  seus `cue`s.
- As falas do Davi no fim do confronto (hoje no `success` da quest) passam para a cutscene
  final quando ela for implementada, sem mudar o texto.
- `Progress` muda de forma antes de o formato do save ser decidido, então a mudança é
  barata agora. Até o save existir, a abertura toca de novo a cada "Iniciar novo jogo",
  como deve.
- Até o autosave da [0020](0020-autosave-por-quest.md) gravar também ao fim de uma cutscene,
  sair do jogo entre a abertura e a primeira quest faz a abertura tocar de novo no próximo
  carregamento. Fica para a decisão do formato do save.
- "Reação do NULL ao resultado" ganha um caminho possível (uma cutscene com `requires` por
  flag), mas continua em aberto.

## Alternativas descartadas

- **Código por cena, direto na timeline do Phaser:** mais rápido para duas cutscenes, mas
  põe conteúdo de história dentro das cenas, o que a 0014 recusa para quest pelo mesmo
  motivo.
- **Gatilho explícito por cutscene** (`onEnter`, `afterQuest`): `requires` mais "ainda não
  vista" já cobre os dois casos, sem um segundo vocabulário.
- **Marcar a cutscene vista com uma flag:** misturaria memória de apresentação com estado
  do mundo que `requires.flags` lê.
- **Marcadores nomeados no mapa:** mais robustos a mudanças de layout, mas exigem objetos
  novos na geração da 0058; tiles bastam para duas cutscenes.
- **Davi como NPC interativo:** nenhuma cena da história pede conversa com ele.
- **Davi só como fala:** a abertura pede que ele ande até o painel, o que fala não mostra.
