// Interior of the entrance guardhouse — where Marcos actually stands (ADR 0059): NPCs live
// inside a scenario, never loose on the outdoor campus map. Drawn like the other rooms
// since ADR 0087: pixel art at the characters' density, made by
// scripts/render-portaria-pixel-art.py, which also writes the layout this file compiles.
//
// Art and collision are separate, as in the other rooms: the floor is a tile layer the
// scene keeps hidden (walkable or not, per 16px tile), and every solid prop (Marcos's desk,
// the turnstiles and their glass barriers, the chairs, the columns) is a `shape`. The wall
// screens and the sign panel hang on the wall and block nothing; the scene swaps their
// pictures as the opening cutscene and the story go (ADR 0066, 0070).

import layout from '../../../assets/portaria/pixel-world/layout.json' with { type: 'json' }

const TILE = 16

const shapes = layout.props
  .filter((prop) => prop.solid !== null)
  .map((prop) => {
    const [dx, dy, width, height] = prop.solid
    return {
      id: prop.id,
      label: prop.label ?? prop.id,
      kind: 'rect',
      color: '#30445c',
      x: prop.x + dx,
      y: prop.y + dy,
      width,
      height,
    }
  })

/** @type {import('@unifor-quest/campus').MapDescription} */
export const entradaDescription = {
  id: 'entrada',
  tileset: 'indoor',
  width: layout.width / TILE,
  height: layout.height / TILE,
  terrain: layout.terrain,
  buildings: [],
  shapes,
}
