// The campus map: the one that carries the graph (ADR 0012). Since ADR 0080 it is drawn like
// the interiors (ADR 0075): pixel art at the characters' own density, made by
// scripts/render-campus-pixel-art.py, which also writes the layout this file compiles. The
// layout follows the real campus (OpenStreetMap): Av. Washington Soares and the gatehouse on
// the west, the Biblioteca and the Centro de Convivência round the Praça Central, the Teatro
// (the game's Auditório) in the north-west woods, the technology and sports blocks east.
//
// Art and collision are separate, as in the interiors: the ground is a tile layer the scene
// keeps hidden (walkable or not, per 16px tile), each story building is a `building` object
// whose box is its solid base, and every other solid prop (classroom blocks, trees, benches,
// lamps, the fountain) is a `shape`, an ellipse or a rectangle.

import layout from '../../../assets/campus/pixel-world/layout.json' with { type: 'json' }

const TILE = 16

const solidOf = (prop) => {
  const [dx, dy, width, height] = prop.solid
  return { x: prop.x + dx, y: prop.y + dy, width, height }
}

const buildings = layout.props
  .filter((prop) => prop.kind === 'building')
  .map((prop) => ({ id: prop.id, label: prop.label, asset: prop.id, ...solidOf(prop) }))

const shapes = layout.props
  .filter((prop) => prop.kind !== 'building' && prop.solid !== null)
  .map((prop) => ({
    id: prop.id,
    label: prop.label ?? prop.id,
    kind: prop.ellipse === true ? 'ellipse' : 'rect',
    color: '#30445c',
    ...solidOf(prop),
  }))

const nodes = layout.nodes
const at = Object.fromEntries(nodes.map((node) => [node.id, node]))
const distance = (a, b) => Math.round(Math.hypot(at[a].x - at[b].x, at[a].y - at[b].y))
// The walkways as they run on the map: the main walk from the gate past the Praça Central,
// the library and the convivência, on to the tech block and the sports park; the path up
// through the woods to the Teatro; the one past the athletics track to the lake.
const edges = [
  ['ENTR', 'BIB'],
  ['BIB', 'CCV'],
  ['BIB', 'AUD'],
  ['ENTR', 'AUD'],
  ['CCV', 'TEC'],
  ['TEC', 'CE'],
  ['TEC', 'LAG'],
  ['CE', 'LAG'],
].map(([from, to]) => ({ from, to, weight: distance(from, to) }))

/** @type {import('@unifor-quest/campus').MapDescription} */
export const campusDescription = {
  id: 'campus',
  tileset: 'indoor',
  width: layout.width / TILE,
  height: layout.height / TILE,
  terrain: layout.terrain,
  buildings,
  shapes,
  graph: { nodes, edges },
}
