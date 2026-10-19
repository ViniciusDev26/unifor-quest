import type { Quest } from '@unifor-quest/core'
import { acervoEmbaralhadoQuest } from './biblioteca.js'
import { oConfrontoQuest } from './bloco-de-tecnologia.js'
import { filaDoCentroDeConvivenciaQuest } from './centro-de-convivencia.js'
import { placasEmbaralhadasQuest } from './entrada.js'

/**
 * The whole story, in order: one quest per stop, four stops, at most 20 minutes of play
 * (ADR 0064, docs/story.md).
 */
export const storyQuests: readonly Quest[] = [
  placasEmbaralhadasQuest,
  acervoEmbaralhadoQuest,
  filaDoCentroDeConvivenciaQuest,
  oConfrontoQuest,
]
