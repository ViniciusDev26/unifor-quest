# 0061 — O jogo começa na portaria, o campus se abre depois de Marcos

- Status: aceita
- Data: 2026-09-29

## Contexto

Com a [entrada](0059-npc-oferece-a-quest-mais-adiantada.md) construída como um cenário
próprio (0059), o jogo ainda abria na cena placeholder da Fase A (`world`, o "Monitor" sem
posição no mundo) e deixava o campus inteiro acessível assim que o jogador apertasse M —
sem passar por Marcos, sem cifra, sem nada.

Isso não bate com a história: Marcos é o segurança da catraca, o primeiro obstáculo antes
do campus. E o efeito que "Placas embaralhadas" já dispara — `setFlag minimapa-liberado`
(ADR 0034) — não tinha nenhum efeito de verdade: o jogador chegava no campus de qualquer
jeito, com ou sem o flag.

## Decisão

- **O jogo abre dentro da portaria.** `entrada` é a primeira cena da lista passada ao
  `Phaser.Game` (a primeira entrada de um array de scene config é a que o Phaser ativa ao
  iniciar) — não `world`.
- **Esc só leva ao campus se `minimapa-liberado` estiver nos `flags` do `Progress`.**
  `createEntradaScene` ganha `canLeave: () => boolean`; `main.ts` implementa isso como
  `progress.flags.includes('minimapa-liberado')` — o nome do flag é conteúdo de
  `fase-1.ts`, então quem decide "que flag libera o quê" continua sendo `main.ts`, não a
  cena. Tentar sair sem o flag mostra uma fala do Marcos pela mesma `dialogueBox`, em vez
  de simplesmente não fazer nada.
- **`world` continua registrada**, só não é mais onde o jogo começa: fica acessível de
  dentro do campus com M, exatamente como antes — o teste de conceito da Fase A não foi
  apagado, só parou de ser a porta de entrada.

## Consequências

- Terminar "Placas embaralhadas" passa a ter uma consequência jogável de verdade, não só
  um flag guardado sem uso.
- Um jogador que nunca fala com Marcos nunca sai da portaria — não existe atalho por fora
  (M, dentro da `entrada`, não está ligado a nada; só existe de dentro do `world` e do
  `campus`).
- Nenhuma mudança em `core`: a regra é só "que flag libera a saída", decidida em
  `main.ts` com o `isQuestAvailable`/`Progress` que já existiam.

## Alternativas descartadas

- **Bloquear no lado do campus** (checar o flag ao tentar entrar pelo portão): não faz
  sentido, porque o jogador começa dentro da portaria — não existe uma "tentativa de
  entrar" vinda de fora até ele já ter saído uma vez.
