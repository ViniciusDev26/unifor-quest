# 0059 — Um NPC oferece a quest mais adiantada que estiver disponível

- Status: aceita
- Data: 2026-09-29

## Contexto

A Fase 1 da [história](../story.md) tem duas quests seguidas no mesmo NPC: Marcos, o
segurança da catraca, oferece "Placas embaralhadas" e, só depois de
completada, "Catraca travada" (`requires.quests`, ADR 0034). É o primeiro NPC de verdade no
mapa — até aqui só existia o placeholder da Fase A (`world-scene`, um "Monitor" fixo, sem
posição no mundo).

`createQuestPanel` (ADR daquele momento, não registrado à parte) já amarra **uma** quest a
**um** painel. Um NPC com duas quests em sequência precisa decidir qual painel abrir quando
o jogador aperta E.

## Decisão

- **NPC nunca fica solto no mapa aberto do campus — só dentro de um cenário interno.**
  Marcos mora na portaria (`content/maps/src/entrada.mjs` + `entrada-scene.ts`), um
  interior pequeno igual ao da Biblioteca, não um sprite em pé perto dos portões de
  `campus.mjs`. Chegar até ele é andar até o portão no campus e apertar E — o mesmo
  mecanismo genérico de "entrar num prédio" que já existia para a Biblioteca
  (`ENTERABLE` em `campus-scene.ts`, um mapa `buildingId -> cena`), não um caso especial.
  `campus-scene.ts` não conhece NPC nenhum: só decide qual porta abre para qual cena.
- **NPC é sprite parado + raio de proximidade**, mesma convenção de fechamento
  (`createNpc`/`isNearNpc` em `apps/game/src/renderer/src/scenes/npc.ts`) que as cenas já
  usam para prédio e jogador — sem classe, sem estado fora do closure (0039).
- **Cada quest de um NPC continua com seu próprio painel** (`createQuestPanel` não muda).
  `main.ts` guarda a lista `{ quest, panel }[]` do NPC e, ao conversar, abre o painel da
  **última quest disponível** (`isQuestAvailable`, percorrendo a lista de trás para frente).
  Como uma quest completada continua disponível para replay (0030), isso funciona nos três
  casos: nada feito ainda → abre a primeira; primeira feita → abre a segunda; as duas feitas
  → reabre a segunda (a mais adiantada), não a primeira.

## Consequências

- Nenhuma mudança em `core`: a regra vive inteira em `apps/game`, usando `isQuestAvailable`
  que já existia.
- Um NPC com mais quests é mais entradas na mesma lista — não pede um outro mecanismo até
  aparecer um caso que essa regra não cubra (ex.: quests paralelas, não sequenciais, do
  mesmo NPC).
- `Quest.dialogue` e `Effect` (ADR 0027, 0034) não mudaram — as falas do Marcos e os flags
  que ele libera (`minimapa-liberado`, `catraca-aberta`) são só conteúdo.
- Todo cenário com NPC precisa de um `.tmj` próprio (mesmo que minúsculo, como a portaria),
  seguindo o pipeline gerado da 0058 — não existe atalho de "objeto solto no campus" para
  quem só quer um NPC sem construir um interior de verdade.

## Alternativas descartadas

- **Um painel só, quest trocada em tempo de execução:** exigiria reescrever
  `createQuestPanel` para aceitar troca de `Quest` depois de criado (idioma escolhido,
  projeto por linguagem, editor — tudo teria que ser resetado). Mais barato manter um
  painel por quest enquanto o número de quests por NPC for pequeno.
- **Marcos de pé no mapa aberto, perto dos portões:** foi a primeira versão, construída e
  testada nesta mesma mudança — funcionava, mas mistura duas coisas que deveriam ser
  independentes (o mapa exterior é só geografia entre prédios; NPC e diálogo são conteúdo
  de um lugar específico). Layout do campus mudar não deveria arriscar reposicionar um NPC
  e vice-versa. Substituída pela portaria como cenário próprio antes de qualquer commit.
