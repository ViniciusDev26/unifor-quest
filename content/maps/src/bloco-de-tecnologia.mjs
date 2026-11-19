// Quest 4 — navigation / collision backing for the approved Bloco de Tecnologia art.
// Artwork and collision are separate: classrooms, the enlarged restroom, Mequi,
// furniture and NULL's console are solid; the two small entrance steps are portals,
// not staircases to another floor. Sizes are in pixels of the 1456 x 1088 scene.

import layout from '../../../assets/tech/pixel-world/layout.json' with { type: 'json' }
import { createGrid, toRows } from './grid.mjs'

const TILE = 16
const WIDTH = 91
const HEIGHT = 68

function inside(x, y) {
  // Central hall, walkable north and south step thresholds; architectural edge solid.
  if (x >= 47 && x <= 1410 && y >= 123 && y <= 822) return true
  if (x >= 632 && x <= 803 && y >= 51 && y <= 995) return true
  return false
}

const floor = createGrid(WIDTH, HEIGHT, ' ')
for (let row = 0; row < HEIGHT; row++) {
  for (let col = 0; col < WIDTH; col++) {
    const x = (col + 0.5) * TILE
    const y = (row + 0.5) * TILE
    if (inside(x, y)) floor[row][col] = '.'
  }
}

// Runtime sprites and physical footprints are generated together from one manifest.
// The room facade is tall for proper occlusion; it never blocks outside its
// explicitly authored solid base. Lounge seats are elliptical, not rectangles.
const solids = layout.props.map((prop) => {
  const [dx, dy, width, height] = prop.solid
  return {
    id: prop.id,
    label: prop.label ?? prop.id,
    kind: ['bench', 'plant'].includes(prop.kind) ? 'ellipse' : 'rect',
    x: prop.x + dx,
    y: prop.y + dy,
    width,
    height,
    color: '#30445c',
  }
})

/** @type {import('@unifor-quest/campus').MapDescription} */
export const blocoDeTecnologiaDescription = {
  id: 'bloco-de-tecnologia',
  tileset: 'indoor',
  width: WIDTH,
  height: HEIGHT,
  terrain: toRows(floor),
  buildings: [],
  shapes: solids,
}
