// Interior of the entrance guardhouse — where Marcos, the turnstile guard, actually stands (ADR 0059):
// NPCs live inside a scenario, never loose on the outdoor campus map. Smaller than the
// Biblioteca, since it is a booth by the turnstile, not a whole building.

import { createGrid, toRows } from './grid.mjs'

const WIDTH = 16
const HEIGHT = 12

/** @type {import('@unifor-quest/campus').MapDescription} */
export const entradaDescription = {
  id: 'entrada',
  tileset: 'indoor',
  width: WIDTH,
  height: HEIGHT,
  terrain: toRows(createGrid(WIDTH, HEIGHT, '.')),
  buildings: [],
}
