// The campus (ADR 0080): an independent check of the compiled map the scene collides with.
// Starting at the gatehouse's door, every door the story needs and every place a building
// lets the player out must be reachable on foot — a tree or a bench placed by the generator
// on the wrong spot would otherwise wall a door off without anyone noticing until playing.
import { readFileSync } from 'node:fs'

const map = JSON.parse(readFileSync('content/maps/campus.tmj', 'utf8'))
const layout = JSON.parse(readFileSync('assets/campus/pixel-world/layout.json', 'utf8'))
const ground = map.layers.find((layer) => layer.name === 'ground').data
const objects = map.layers.find((layer) => layer.name === 'buildings').objects
const TILE = 16

const overlaps = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

function hits(feet, object) {
  if (!overlaps(feet, object)) return false
  if (object.type === 'building') return true
  if (object.properties.find((p) => p.name === 'kind')?.value !== 'ellipse') return true
  const rx = object.width / 2
  const ry = object.height / 2
  const cx = object.x + rx
  const cy = object.y + ry
  const qx = Math.max(feet.x, Math.min(cx, feet.x + feet.width))
  const qy = Math.max(feet.y, Math.min(cy, feet.y + feet.height))
  return ((qx - cx) / rx) ** 2 + ((qy - cy) / ry) ** 2 < 1
}

// The same feet box as player.ts: 14x8, its top 12px below the sprite's centre.
function walkable(x, y) {
  const feet = { x: x - 7, y: y + 12, width: 14, height: 8 }
  for (const [px, py] of [
    [feet.x, feet.y],
    [feet.x + feet.width, feet.y],
    [feet.x, feet.y + feet.height],
    [feet.x + feet.width, feet.y + feet.height],
  ]) {
    const tx = Math.floor(px / TILE)
    const ty = Math.floor(py / TILE)
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false
    if (ground[ty * map.width + tx] === 0) return false
  }
  return !objects.some((object) => object.type !== 'node' && hits(feet, object))
}

const start = layout.entrances.portaria
if (!walkable(start.x, start.y)) throw Error('A saída da portaria está bloqueada')
const step = 8
const seen = new Set([`${start.x},${start.y}`])
const reached = [start]
for (let i = 0; i < reached.length; i++) {
  const { x, y } = reached[i]
  for (const [nx, ny] of [
    [x - step, y],
    [x + step, y],
    [x, y - step],
    [x, y + step],
  ]) {
    const key = `${nx},${ny}`
    if (!seen.has(key) && walkable(nx, ny)) {
      seen.add(key)
      reached.push({ x: nx, y: ny })
    }
  }
}

const near = (point, radius) =>
  reached.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < radius)
// The scene opens a door within 38px of its point, measured from the feet (player.y + 12).
for (const door of layout.doors) {
  if (!near({ x: door.x, y: door.y - 12 }, 30))
    throw Error(`Sem caminho até a porta: ${door.buildingId}`)
  console.log(`✓ Porta alcançável: ${door.buildingId}`)
}
for (const [name, point] of Object.entries(layout.entrances)) {
  if (!walkable(point.x, point.y)) throw Error(`Saída bloqueada: ${name}`)
  if (!near(point, 12)) throw Error(`Saída isolada do resto do campus: ${name}`)
  console.log(`✓ Saída livre e ligada ao campus: ${name}`)
}
console.log(`✓ Navegação conectada: ${reached.length} posições alcançáveis`)
