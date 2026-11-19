# Cutscenes: como escrever e como tocar

Guia prático do sistema de cutscenes. As decisões estão na
[ADR 0066](decisions/0066-cutscene-e-dado.md), que define a cutscene como dado, e na
[ADR 0076](decisions/0076-final-em-duas-cutscenes-e-creditos.md), que define o final em duas
cenas. Este documento explica como usar o sistema no dia a dia.

## O que é

Uma cutscene é uma cena que o jogador assiste, em vez de jogar. No código, ela é uma lista de
passos declarativos, validada por Zod em `core`, que a cena do Phaser encena um passo de cada
vez. O conteúdo fica fora das cenas, pela mesma razão das quests
([ADR 0014](decisions/0014-quests-declarativas.md)).

| Cutscene | Cena | Toca quando | Arquivo |
| --- | --- | --- | --- |
| `abertura` | `entrada` | Ao começar um jogo novo | `content/entrada.ts` |
| `final` | `bloco-de-tecnologia` | Depois de "O confronto", com o painel fechado | `content/bloco-de-tecnologia.ts` |
| `epilogo` | `campus` | Logo depois da `final`, ao chegar no campus | `content/bloco-de-tecnologia.ts` |

Os caminhos de conteúdo são relativos a `apps/game/src/renderer/src/`.

## Onde mora cada coisa

| Peça | Arquivo | Papel |
| --- | --- | --- |
| Schema | `packages/core/src/entities/cutscene.ts` | `cutsceneSchema`, `cutsceneStepSchema`, `TilePoint` |
| Regras | `packages/core/src/rules/cutscenes.ts` | `pendingCutscene` e `markCutsceneSeen` |
| Memória | `Progress.seenCutscenes` | Ids das cutscenes já vistas, gravados no save |
| Conteúdo | `content/<lugar>.ts` | Cada cutscene fica ao lado da quest do lugar |
| Ordem | `content/story.ts` (`storyCutscenes`) | A primeira devida de cada cena toca primeiro |
| Encenação | `scenes/cutscene-player.ts` | `createCutscenePlayer`: tweens, câmera, caixa de diálogo |
| Ponte | `main.ts` (`cutscenes: CutsceneHost`) | Diz o que está pendente, esconde a HUD e marca como vista |

## Anatomia

```ts
export const finalCutscene: Cutscene = cutsceneSchema.parse({
  id: 'final', // único no jogo; vai para seenCutscenes
  scene: 'bloco-de-tecnologia', // chave da cena do Phaser onde toca
  requires: { quests: ['o-confronto'], flags: [] }, // mesma forma do requires da quest
  steps: [
    { kind: 'wait', ms: 400 },
    { kind: 'cue', name: 'null-se-desfaz' },
    { kind: 'fade', direction: 'out', ms: 900 },
    { kind: 'cue', name: 'volta-ao-campus' },
  ],
})
```

Sempre use `cutsceneSchema.parse(...)`. Assim um passo malformado falha quando o módulo é
importado, e não no meio da cena.

## Os passos

Os passos rodam em sequência: cada um termina antes de o próximo começar. O vocabulário é
fechado, e ampliá-lo é uma mudança de engine, com ADR.

| Passo | Campos | O que faz |
| --- | --- | --- |
| `say` | `lines: [{ speaker, text }]` | Abre a caixa de diálogo. E avança cada fala, e o passo termina depois da última. |
| `wait` | `ms` | Espera. Usa o relógio da cena, então a pausa congela a espera. |
| `spawn` | `actor`, `at` | Põe na cena um ator que estava fora, na posição dada em tiles. |
| `despawn` | `actor` | Tira um ator da cena. |
| `move` | `actor`, `to` | Anda até a posição em linha reta, a 90 px/s, com a animação de caminhada. |
| `fade` | `direction: 'in' \| 'out'`, `ms` | Clareia ou escurece a câmera. |
| `cue` | `name` | Pede à cena um efeito dela pelo nome (ver abaixo). |

### Posições em tiles

`at` e `to` são em **tiles do mapa da cena**, com tiles de 16 px. Frações valem: `x: 9.5` é o
meio do tile 9. Para converter um ponto em pixels, divida por 16. Por exemplo, a porta norte
do Bloco de Tecnologia no campus fica em `(128, 484)` px, que é `(8, 30.25)` em tiles.

`move` anda em linha reta e **não respeita colisão**. Escolha pontos com caminho livre
entre eles.

### Atores

- `calouro` é o próprio jogador (`PLAYER_ACTOR`) e já está em cena quando a cutscene começa.
- Os outros atores entram por `spawn`. Cada cena declara quais atores pode receber e com qual
  folha de sprite (4×4, como a de um NPC):
  - na portaria, por `actors` em `createInteriorScene`;
  - no campus, por `actors` em `createCampusScene`, passado pelo `main.ts`.

O Davi é só ator e nunca vira NPC ([ADR 0066](decisions/0066-cutscene-e-dado.md)). Ele usa
`characters/straw.png` nas duas cutscenes em que aparece.

### `cue`: o efeito que só a cena sabe desenhar

O dado diz *quando*, e a cena diz *como*. Cada cena registra os seus `cue`s ao criar o
`CutscenePlayer`. Um `cue` recebe a cena e uma função `done`, que deve ser chamada quando o
efeito terminar: na hora, se o efeito é instantâneo, ou no fim da animação.

| Cena | `cue` | Efeito |
| --- | --- | --- |
| `entrada` | `telas-null` | As telas da parede apagam e mostram `NULL` (decoração da sala) |
| `entrada` | `painel-reinicia` | O painel de placas reinicia e fica ilegível |
| `bloco-de-tecnologia` | `null-se-desfaz` | Glitch, blocos verdes saindo do terminal e a rede restaurada |
| `bloco-de-tecnologia` | `volta-ao-campus` | Leva o jogador à porta norte do Bloco, no campus |
| `campus` | `creditos` | Abre a cena de créditos |

**Um `cue` que troca de cena só pode ser o último passo.** Ele chama `done()` antes de
`scene.start(...)`, para que a cutscene seja marcada como vista antes de a cena parar.
Qualquer passo depois dele nunca tocaria ([ADR 0076](decisions/0076-final-em-duas-cutscenes-e-creditos.md)).

## Quando toca

`pendingCutscene(storyCutscenes, cena, progress)` devolve a primeira cutscene daquela cena que
satisfaz três condições: `requires` atendido, ainda fora de `seenCutscenes` e na ordem de
`storyCutscenes`. Não existe gatilho próprio, e a cena pergunta nestes momentos:

- **ao ser criada**: é assim que tocam a `abertura` e o `epilogo`;
- **quando `progress` muda** (`progressChanged()`, chamado pelo `main.ts`): é o caso das
  salas de `createInteriorScene` e da Biblioteca;
- **no `update`, quando a consequência pode ser vista** (`canPlayCompletion`, que exige o
  painel do editor fechado): é o caso da `final`. Enquanto o painel cobre a tela, a cutscene
  espera.

Ao terminar, `main.ts` chama `markCutsceneSeen` e a cutscene não toca mais nesse save. "Iniciar
novo jogo" zera o progresso, e por isso a abertura volta a tocar.

## Durante a cutscene

- O jogador não anda e E não faz nada. A HUD de objetivo fica escondida (`onStart`/`onEnd`).
- **Não dá para pular a cutscene.** Os créditos, que são uma cena e não uma cutscene, podem
  ser pulados.
- **Esc pausa.** O menu de pausa congela o relógio e os tweens da cena, então `wait` e `move`
  param junto.
- Um ator ou `cue` que a cena não conhece é erro de desenvolvedor. O `CutscenePlayer` confere
  toda a lista antes do primeiro passo (`checkCast`) e lança um erro dizendo o que falta.

## Receita: uma cutscene nova

1. Escreva a cutscene em `content/<lugar>.ts` com `cutsceneSchema.parse`.
2. Acrescente-a em `storyCutscenes` (`content/story.ts`).
3. Se ela usar um ator novo, declare a folha de sprite dele na cena (`actors`).
4. Se ela usar um `cue` novo, registre-o na cena que vai encená-lo.
5. Se a cena ainda não toca cutscenes, siga o padrão de `tecnologia-scene.ts`, que tem cinco
   partes:
   - `createCutscenePlayer(this, { cast, cues, dialogueBox })` no `create`;
   - uma consulta a `options.cutscenes.pending(KEY)` nos momentos certos, chamando
     `onStart`, depois `play` e, no fim, `onEnd`;
   - o movimento e a tecla E bloqueados enquanto `cutscenePlayer.active` for verdadeiro;
   - a referência ao player zerada no `shutdown`;
   - `cutscenes` passado pelo `main.ts`.
6. Escreva um teste de conteúdo, como `apps/game/test/content/final.test.ts`, provando que a
   cutscene fica devida onde e quando a história manda, e só uma vez.

## Limites conhecidos

- O autosave só grava ao concluir uma quest ([ADR 0020](decisions/0020-autosave-por-quest.md)),
  então `seenCutscenes` vai para o disco junto com a próxima quest concluída. Fechar o jogo
  logo depois de uma cutscene faz ela tocar de novo ao carregar.
- Sem marcadores no mapa, as posições em tiles precisam ser revistas se o layout do lugar
  mudar.
