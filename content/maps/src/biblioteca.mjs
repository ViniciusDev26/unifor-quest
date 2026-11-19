// Interior of the Biblioteca (ADR 0058), as the story opens it: shelves knocked over,
// Dona Célia behind her counter, the terminal next to her showing NULL (docs/story.md).
//
// The room is drawn as layered pixel art by scripts/render-biblioteca-pixel-art.py, at one
// art pixel per game pixel (the same density as the characters). That script also writes
// assets/biblioteca/pixel-world/layout.json, and this file reads the walkable floor and
// every prop's footprint from it: the collision in the .tmj is, by construction, the
// ground contact of the sprite the player sees. To change the room, edit the script, run
// it, then `npm run generate:maps`.

import layout from '../../../assets/biblioteca/pixel-world/layout.json' with { type: 'json' }
import { createGrid, toRows } from './grid.mjs'

const TILE = layout.tile
const WIDTH = layout.width / TILE
const HEIGHT = layout.height / TILE

const floor = createGrid(WIDTH, HEIGHT, ' ')
for (const [x, y, width, height] of layout.floor) {
  for (let ty = y / TILE; ty < (y + height) / TILE; ty++) {
    for (let tx = x / TILE; tx < (x + width) / TILE; tx++) {
      floor[ty][tx] = '.'
    }
  }
}

const solids = layout.props.flatMap((prop) => {
  const boxes = [prop.solid, ...(prop.extraSolids ?? [])]
  return boxes
    .filter(([, , width, height]) => width > 0 && height > 0)
    .map(([dx, dy, width, height], index) => ({
      id: index === 0 ? prop.id : `${prop.id}-${index}`,
      label: index === 0 ? prop.id : `${prop.id}-${index}`,
      kind: 'rect',
      color: '#6b4226',
      x: prop.x + dx,
      y: prop.y + dy,
      width,
      height,
    }))
})

/** @type {import('@unifor-quest/campus').MapDescription} */
export const bibliotecaDescription = {
  id: 'biblioteca',
  tileset: 'indoor',
  width: WIDTH,
  height: HEIGHT,
  terrain: toRows(floor),
  buildings: [],
  shapes: solids,
}
