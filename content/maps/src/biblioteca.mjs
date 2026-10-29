// Interior of the Biblioteca (ADR 0058), as the story opens it: shelves knocked over,
// Dona Célia behind her counter, the terminal next to her showing NULL (docs/story.md).
// No walls in the content data: the scene draws the border as a plain rectangle.
//
// The furniture is plain shapes for now — none of the vendored packs has a bookshelf. The
// scene draws and collides with whatever shapes the map carries, so real art (#30) only
// changes this file.

import { createGrid, toRows } from './grid.mjs'

const WIDTH = 24
const HEIGHT = 16
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

const SHELF = '#6b4226'

/** @type {import('@unifor-quest/campus').MapDescription} */
export const bibliotecaDescription = {
  id: 'biblioteca',
  tileset: 'indoor',
  width: WIDTH,
  height: HEIGHT,
  terrain: toRows(createGrid(WIDTH, HEIGHT, '#')),
  buildings: [],
  shapes: [
    // A tile below Dona Célia: the player stops at its front edge, and only the feet
    // collide, so a counter right under her would put the player's head over her.
    rect('balcao', 'Balcão', '#8b5a2b', 9, 5, 6, 1),
    rect('terminal', 'Terminal', '#14532d', 15, 4, 1, 1),
    // Knocked over, in two rows either side of the aisle to the door.
    rect('estante-1', 'Estante', SHELF, 2, 7, 6, 1),
    rect('estante-2', 'Estante', SHELF, 2, 10, 6, 1),
    rect('estante-3', 'Estante', SHELF, 2, 13, 6, 1),
    rect('estante-4', 'Estante', SHELF, 16, 7, 6, 1),
    rect('estante-5', 'Estante', SHELF, 16, 10, 6, 1),
    rect('estante-6', 'Estante', SHELF, 16, 13, 6, 1),
  ],
}
