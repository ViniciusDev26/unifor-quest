# 0063 — HUD de objetivo reaproveita a cadeia de quests

- Status: aceita
- Data: 2026-10-01

## Contexto

Discutindo cutscenes para apresentar a história, concluímos que o problema mais urgente era
outro: o jogador não tinha nenhum indício, na tela, do que fazer a seguir — "jogado ao léu".
A ideia proposta: um elemento de HUD mostrando o objetivo atual (ex: "Fale com o porteiro",
"Vá ao Centro de Convivência e fale com X").

A pergunta era se isso exigia um conceito novo no domínio — progresso por etapas dentro de
uma única quest (andar até um lugar, falar com alguém, só então abrir o desafio de código).
Mas cada "etapa" do exemplo já é modelada como uma quest própria, encadeada por
`requires.quests` — `catraca-travada` já exige `placas-embaralhadas`
([fase-1.ts](../../apps/game/src/renderer/src/content/fase-1.ts)). O checklist não precisa de
um mecanismo novo: precisa só mostrar essa cadeia.

## Decisão

- **`Quest` ganha o campo `objective: string`** ([quest.ts](../../packages/core/src/entities/quest.ts)),
  uma frase de instrução ("Fale com o Marcos sobre as placas embaralhadas"), diferente de
  `title` (o nome da quest, "Placas embaralhadas"). Campo obrigatório: todo conteúdo
  declara o seu, igual já acontece com `title`.
- **Nova regra pura em `core`**: `questChecklist(quests, progress)`
  ([quest-checklist.ts](../../packages/core/src/rules/quest-checklist.ts)), que filtra para
  quests completadas ou disponíveis agora e marca cada uma com `completed: boolean`.
  Reaproveita `isQuestAvailable`/`isQuestCompleted` já existentes (ADR 0034) — **nenhuma
  mudança em `Progress`**. Quest ainda não disponível fica de fora de propósito: o checklist
  não entrega o que vem depois, só o que já foi feito e o que já pode ser feito.
- **HUD nova, só em `apps/game`**: `objective-hud.ts`/`.css`, um overlay de DOM fixo no canto
  superior direito, no mesmo estilo do `quest-panel.ts` (overlay de DOM independente de
  cena do Phaser, sobrevive a troca de cena). Fica oculta até `show()` ser chamado — a tela
  de título não tem objetivo nenhum ainda. `main.ts` chama `objectiveHud.refresh()` sempre
  que `progress` é reatribuído, e passa `() => objectiveHud.show()` como
  `onStartNewGame` para o menu, revelado só depois de "Iniciar novo jogo".

## Consequências

- Nenhuma quest existente ou futura escapa de declarar um objetivo: o campo é obrigatório no
  schema, então o compilador pega o esquecimento, não um jogador em produção.
- A HUD continua visível por cima do menu de pausa e da caixa de diálogo (ambos são conteúdo
  do canvas do Phaser; a HUD é DOM, sempre por cima) — aceito como está, é polimento futuro,
  não quebra nada.
- O checklist é por lista de quests que `main.ts` decide passar (hoje, `fase1Quests`); uma
  fase nova decide a sua própria lista — não existe conceito de "fase atual" no domínio, só
  no que a aplicação escolhe mostrar.
- Cutscenes continuam fora de escopo — não foram descartadas, só adiadas.

## Alternativas descartadas

- **Sub-passos dentro de uma única quest** (andar até X, falar com Y, só então o desafio):
  descartada porque o exemplo dado já se encaixa inteiro na cadeia de quests existente: cada
  "passo" vira sua própria quest com `requires`, sem exigir um estado de progresso parcial
  que o domínio não tem hoje (`Progress` só sabe quest completa ou não).
