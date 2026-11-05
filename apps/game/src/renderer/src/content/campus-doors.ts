import type { CampusDoor } from '../scenes/campus-scene.js'

/**
 * Which door of the campus opens onto which scene, keyed by the map's `buildingId` (ADR 0074).
 * Each locked door waits for the step before it in docs/story.md. The Biblioteca and the gates
 * have no lock: nobody reaches the campus without passing Marcos first (ADR 0061), so a lock
 * there could never be seen.
 *
 * `centro-de-convivencia` and `bloco-de-tecnologia` are the keys their interiors register
 * (#10, #11). Until they do, an unlocked door has nowhere to go and does nothing.
 */
export const campusDoors: Readonly<Record<string, CampusDoor>> = {
  biblioteca: { scene: 'biblioteca' },
  'portao-esquerdo': { scene: 'entrada' },
  'portao-direito': { scene: 'entrada' },
  'centro-de-convivencia': {
    scene: 'centro-de-convivencia',
    lock: {
      requires: { quests: [], flags: ['acervo-organizado'] },
      lines: [
        {
          speaker: 'Porta',
          text: 'Travada. A tela ao lado só mostra NULL em verde. Melhor passar na Biblioteca primeiro.',
        },
      ],
    },
  },
  'bloco-de-tecnologia': {
    scene: 'bloco-de-tecnologia',
    lock: {
      requires: { quests: [], flags: ['bloco-tecnologia-revelado'] },
      lines: [
        {
          speaker: 'Porta',
          text: 'Travada. A tela ao lado só mostra NULL, mas lá dentro as luzes continuam acesas.',
        },
      ],
    },
  },
}
