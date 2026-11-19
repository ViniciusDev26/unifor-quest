import type { Cutscene, Quest } from '@unifor-quest/core'
import { arvoreDoAcervoQuest } from './biblioteca.js'
import { epilogoCutscene, finalCutscene, oConfrontoQuest } from './bloco-de-tecnologia.js'
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
export const storyCutscenes: readonly Cutscene[] = [
  aberturaCutscene,
  finalCutscene,
  epilogoCutscene,
]

/**
 * Where each story quest is played, by quest id: the scene a loaded game resumes in, with
 * the player at its entrance (ADR 0077). `campusReturn` is where they come out when they
 * leave, for a room that does not say so itself: a loaded game never walked in through the
 * campus door that would have set it.
 */
export type StoryStop = {
  scene: string
  campusReturn?: { x: number; y: number }
}

export const storyStops: Readonly<Record<string, StoryStop>> = {
  [placasEmbaralhadasQuest.id]: { scene: 'entrada' },
  // Just below the Biblioteca's door on the campus map (584, 280, 112 x 112).
  [arvoreDoAcervoQuest.id]: { scene: 'biblioteca', campusReturn: { x: 640, y: 412 } },
  [filaDoCentroDeConvivenciaQuest.id]: { scene: 'centro-de-convivencia' },
  [oConfrontoQuest.id]: { scene: 'bloco-de-tecnologia' },
}
