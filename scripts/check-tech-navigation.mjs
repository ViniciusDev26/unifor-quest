// Quest 4: independent sanity check of the real Tiled collider layer.
// Prevents new classrooms, bathrooms or kiosk colliders from sealing the
// north/south entrances or the NULL terminal behind an impassable wall.
import { existsSync, readFileSync } from 'node:fs'

const map = JSON.parse(readFileSync('content/maps/bloco-de-tecnologia.tmj', 'utf8'))
const ground = map.layers.find((layer) => layer.name === 'ground').data
const solids = map.layers.find((layer) => layer.name === 'buildings').objects
const TILE = 16
function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}
function hit(foot, shape) {
  if (!overlaps(foot, shape)) return false
  if (shape.properties.find((p) => p.name === 'kind')?.value !== 'ellipse') return true
  const rx = shape.width / 2,
    ry = shape.height / 2,
    cx = shape.x + rx,
    cy = shape.y + ry
  const qx = Math.max(foot.x, Math.min(cx, foot.x + foot.width))
  const qy = Math.max(foot.y, Math.min(cy, foot.y + foot.height))
  return ((qx - cx) / rx) ** 2 + ((qy - cy) / ry) ** 2 < 1
}
function accessible(x, y) {
  const foot = { x: x - 7, y: y + 12, width: 14, height: 8 }
  for (const [xx, yy] of [
    [foot.x, foot.y],
    [foot.x + foot.width, foot.y],
    [foot.x, foot.y + foot.height],
    [foot.x + foot.width, foot.y + foot.height],
  ]) {
    const tx = Math.floor(xx / TILE),
      ty = Math.floor(yy / TILE)
    if (
      tx < 0 ||
      ty < 0 ||
      tx >= map.width ||
      ty >= map.height ||
      ground[ty * map.width + tx] === 0
    )
      return false
  }
  return !solids.some((o) => hit(foot, o))
}
const queue = [{ x: 704, y: 852 }],
  visited = new Set(['704,852']),
  step = 8
if (!accessible(704, 852)) throw new Error('The player start is blocked')
for (let i = 0; i < queue.length; i++) {
  const { x, y } = queue[i]
  for (const [nx, ny] of [
    [x - step, y],
    [x + step, y],
    [x, y - step],
    [x, y + step],
  ]) {
    const key = `${nx},${ny}`
    if (!visited.has(key) && accessible(nx, ny)) {
      visited.add(key)
      queue.push({ x: nx, y: ny })
    }
  }
}
const destinations = [
  ['NULL showdown', 705, 617, 84],
  ['Restroom', 628, 471, 75],
  ['Mequi kiosk', 795, 472, 73],
  ['North steps and exit', 705, 163, 72],
  ['South steps and exit', 705, 785, 72],
  ...Array.from({ length: 5 }, (_, i) => [`Room T10${i + 1}`, 110 + i * 90, 369, 47]),
  ...Array.from({ length: 5 }, (_, i) => [
    `Room T1${String(i + 6).padStart(2, '0')}`,
    936 + i * 90,
    369,
    47,
  ]),
  ...Array.from({ length: 5 }, (_, i) => [`Room T20${i + 1}`, 110 + i * 90, 709, 47]),
  ...Array.from({ length: 5 }, (_, i) => [
    `Room T2${String(i + 6).padStart(2, '0')}`,
    936 + i * 90,
    709,
    47,
  ]),
]
for (const [name, x, y, radius] of destinations) {
  if (!queue.some((p) => Math.hypot(p.x - x, p.y - y) < radius)) throw Error(`No path to: ${name}`)
  console.log(`✓ Reachable: ${name}`)
}
console.log(`✓ Navigation connected: ${queue.length} reachable positions`)

// Each obstacle matches a separate runtime pixel sprite, eliminating drift
// between what players see and what they collide with (same as Quest 3).
const layout = JSON.parse(readFileSync('assets/tech/pixel-world/layout.json', 'utf8'))
if (layout.props.length !== solids.length) throw Error('Sprites and colliders differ in number')
const points = new Set()
for (const prop of layout.props) {
  const [dx, dy, w, h] = prop.solid
  const collider = solids.find((o) => o.name === (prop.label ?? prop.id))
  if (
    !collider ||
    collider.x !== prop.x + dx ||
    collider.y !== prop.y + dy ||
    collider.width !== w ||
    collider.height !== h
  )
    throw Error(`Sprite and collider diverge: ${prop.id}`)
  const sprite = `apps/game/src/renderer/public/scene-art/tech-props/${prop.id}.png`
  if (!existsSync(sprite)) throw Error(`Sprite not copied: ${prop.id}`)
  const png = readFileSync(sprite)
  if (png.subarray(1, 4).toString() !== 'PNG') throw Error(`Invalid PNG: ${prop.id}`)
  if (
    Math.abs(png.readUInt32BE(16) - prop.width) > 1 ||
    Math.abs(png.readUInt32BE(20) - prop.height) > 1
  )
    throw Error(`Wrong art dimensions: ${prop.id}`)
  if (points.has(prop.id)) throw Error(`Duplicate ID: ${prop.id}`)
  points.add(prop.id)
}
console.log(`✓ ${layout.props.length} sprites and colliders in sync with the scene`)
