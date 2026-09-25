// Interior of the Biblioteca — the proof that the same pipeline works for `indoor.png`,
// not just `world.png` (ADR 0058). No walls in the content data: a room this simple draws
// its border as a plain rectangle in the scene, not as tiles — see `campus-scene.ts`.

import { createGrid, toRows } from './grid.mjs'

const WIDTH = 24
const HEIGHT = 16

/** @type {import('@unifor-quest/campus').MapDescription} */
export const bibliotecaDescription = {
  id: 'biblioteca',
  tileset: 'indoor',
  width: WIDTH,
  height: HEIGHT,
  terrain: toRows(createGrid(WIDTH, HEIGHT, '.')),
  buildings: [],
}
