# 0020 — Save automático ao concluir uma quest

- Status: aceita
- Data: 2026-09-22

## Contexto

O jogo é uma sequência de quests concluídas ([ADR 0014](0014-quests-declarativas.md)), e é
a conclusão de uma quest que muda o mundo de fato ([ADR 0013](0013-codigo-com-consequencia-no-mundo.md)):
flags viram verdadeiras, áreas destravam, o estado avança. Fora desses momentos, o que
muda é posição de personagem e texto de diálogo.

## Decisão

**O save é automático, e o gatilho é a conclusão de uma quest.**

- Não há save manual: o jogador não escolhe quando salvar.
- Cada quest concluída dispara um autosave, depois de o `onSuccess` ter sido aplicado.
- A escrita é feita pelo main process, via `window.api.save`
  ([ADR 0008](0008-quest-engine-no-renderer.md)).

O save fica em `userData`, separado do material regenerável de execução
([0026](0026-diretorio-de-trabalho-e-save.md)). Formato e versionamento continuam em
aberto — ver [../open-questions.md](../open-questions.md).

## Consequências

- O ponto de persistência é único e previsível, e coincide com o único momento em que o
  progresso realmente avança.
- Sem save manual, não existe slot escolhido pelo jogador; se vai haver mais de um save,
  é decisão separada.
- A perda máxima é **uma quest em andamento**. Isso inclui o código que o jogador estava
  escrevendo numa quest que ele ainda não concluiu — ver a questão do formato do save em
  [../open-questions.md](../open-questions.md).
- A escrita precisa ser **atômica** (arquivo temporário e rename), senão um crash no meio
  do autosave corrompe o save justamente no momento de maior progresso.
- Ao carregar, o save é dado externo: entra como `unknown` e passa por validação
  ([ADR 0017](0017-type-safety-total.md), [ADR 0019](0019-zod-no-core.md)).
- Se o autosave falhar (disco cheio, permissão), o jogo precisa avisar — falhar em
  silêncio some com o progresso sem o jogador perceber.

## Alternativas descartadas

- **Save manual pelo jogador:** adiciona fricção e uma tela, num jogo que não tem risco de
  morte nem permadeath — não há o que gerenciar.
- **Autosave por tempo:** salva em momentos arbitrários, sem relação com o progresso, e
  pode capturar o mundo no meio de uma transição.
