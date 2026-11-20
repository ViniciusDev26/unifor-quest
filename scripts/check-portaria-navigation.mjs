// The portaria (ADR 0087): from where the game starts, Marcos's counter and the way out to
// the campus must be reachable on foot, with the same feet as the player — a turnstile or
// a queue post placed on the wrong spot would otherwise shut the first quest out.
import { readFileSync } from 'node:fs'

const map = JSON.parse(readFileSync('content/maps/entrada.tmj', 'utf8'))
const layout = JSON.parse(readFileSync('assets/portaria/pixel-world/layout.json', 'utf8'))
const ground = map.layers.find((layer) => layer.name === 'ground').data
const solids = map.layers.find((layer) => layer.name === 'buildings').objects
const TILE = 16

const overlaps = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

// Marcos's own body blocks the feet too (npc.ts: 24x24 round his position).
const marcos = { x: layout.marcos.x - 12, y: layout.marcos.y - 12, width: 24, height: 24 }

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
  return !solids.some((solid) => overlaps(feet, solid)) && !overlaps(feet, marcos)
}

const start = layout.spawn
if (!walkable(start.x, start.y)) throw Error('The player start is blocked')
const step = 4
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

// The scene talks to Marcos within 46px of the talk point, and leaves within 52 of the exit.
for (const [name, point, radius] of [
  ['Marcos', layout.talk, 40],
  ['Exit to the campus', layout.exit, 46],
]) {
  if (!reached.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < radius)) {
    throw Error(`No path to: ${name}`)
  }
  console.log(`✓ Reachable: ${name}`)
}
console.log(`✓ Navigation connected: ${reached.length} reachable positions`)
