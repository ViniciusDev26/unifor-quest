import type { Cutscene, Quest } from '@unifor-quest/core'
import { arvoreDoAcervoQuest } from './biblioteca.js'
import { oConfrontoQuest } from './bloco-de-tecnologia.js'
import { filaDoCentroDeConvivenciaQuest } from './centro-de-convivencia.js'
import { aberturaCutscene, placasEmbaralhadasQuest } from './entrada.js'

/**
 * The whole story, in order: one quest per stop, four stops, at most 20 minutes of play
 * (ADR 0064, docs/story.md).
 */
export const storyQuests: readonly Quest[] = [
  placasEmbaralhadasQuest,
  arvoreDoAcervoQuest,
  filaDoCentroDeConvivenciaQuest,
  oConfrontoQuest,
]

/**
 * Every cutscene, each played once in its own scene when its `requires` holds (ADR 0066).
 * Order matters only between cutscenes of the same scene: the first one due plays first.
 */
export const storyCutscenes: readonly Cutscene[] = [aberturaCutscene]
