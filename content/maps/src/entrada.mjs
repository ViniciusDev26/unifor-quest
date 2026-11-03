// Interior of the entrance guardhouse — where Marcos, the turnstile guard, actually stands (ADR 0059):
// NPCs live inside a scenario, never loose on the outdoor campus map. Smaller than the
// Biblioteca, since it is a booth by the turnstile, not a whole building.
//
// The screens on the wall and the sign panel are what the opening cutscene acts on: the
// screens go dark showing NULL, Davi resets the panel and the signs turn to gibberish
// (docs/story.md, ADR 0066). The scene finds them by id; their look here is the lit state.

import { createGrid, toRows } from './grid.mjs'

const WIDTH = 16
const HEIGHT = 12
const TILE = 16

/** A rectangle given in tiles, stored in pixels like every other map object. */
function rect(id, label, color, x, y, width, height) {
  return {
    id,
    label,
    kind: 'rect',
    color,
    x: x * TILE,
    y: y * TILE,
    width: width * TILE,
    height: height * TILE,
  }
}

const SCREEN = '#2563eb'

/** @type {import('@unifor-quest/campus').MapDescription} */
export const entradaDescription = {
  id: 'entrada',
  tileset: 'indoor',
  width: WIDTH,
  height: HEIGHT,
  terrain: toRows(createGrid(WIDTH, HEIGHT, '.')),
  buildings: [],
  shapes: [
    rect('tela-1', 'Tela', SCREEN, 2, 1, 2, 1),
    rect('tela-2', 'Tela', SCREEN, 5, 1, 2, 1),
    rect('painel', 'Painel de placas', '#1f2937', 11, 1, 3, 1),
  ],
}
