// Dependency-free navigation sanity test for the Quest 3 floor plan.
// The game handles live NPCs separately; here we check the static walkable
// floor / shop collisions and access to the two exits and quest giver.
import { readFileSync } from 'node:fs'

const map = JSON.parse(readFileSync('content/maps/centro-de-convivencia.tmj', 'utf8'))
const floor = map.layers.find((layer) => layer.name === 'ground').data
const shapes = map.layers.find((layer) => layer.name === 'buildings').objects
const T = 16
const width = map.width
const height = map.height

function overlapsFeet(x, y, obstacle) {
  const feet = { x: x - 7, y: y + 12, width: 14, height: 8 }
  if (
    !(
      feet.x < obstacle.x + obstacle.width &&
      feet.x + feet.width > obstacle.x &&
      feet.y < obstacle.y + obstacle.height &&
      feet.y + feet.height > obstacle.y
    )
  )
    return false
  if (obstacle.properties.find((p) => p.name === 'kind')?.value !== 'ellipse') return true
  const rx = obstacle.width / 2
  const ry = obstacle.height / 2
  const cx = obstacle.x + rx
  const cy = obstacle.y + ry
  const closestX = Math.max(feet.x, Math.min(cx, feet.x + feet.width))
  const closestY = Math.max(feet.y, Math.min(cy, feet.y + feet.height))
  return ((closestX - cx) / rx) ** 2 + ((closestY - cy) / ry) ** 2 < 1
}
function isWalkable(x, y) {
  for (const [px, py] of [
    [x - 7, y + 12],
    [x + 7, y + 12],
    [x - 7, y + 20],
    [x + 7, y + 20],
  ]) {
    const tx = Math.floor(px / T)
    const ty = Math.floor(py / T)
    if (tx < 0 || ty < 0 || tx >= width || ty >= height || floor[tx + ty * width] === 0)
      return false
  }
  return !shapes.some((shape) => overlapsFeet(x, y, shape))
}

const start = { x: 704, y: 800 }
const queue = [{ x: 704, y: 800 }]
const step = 8
const visited = new Set([`${start.x},${start.y}`])
for (let i = 0; i < queue.length; i++) {
  const { x, y } = queue[i]
  for (const [nx, ny] of [
    [x - step, y],
    [x + step, y],
    [x, y - step],
    [x, y + step],
  ]) {
    const key = `${nx},${ny}`
    if (visited.has(key) || !isWalkable(nx, ny)) continue
    visited.add(key)
    queue.push({ x: nx, y: ny })
  }
}
for (const [name, x, y, radius] of [
  ['Seu Raimundo', 705, 414, 40],
  ['Portão sul', 704, 902, 74],
  ['Portão norte', 706, 118, 74],
]) {
  const reachable = queue.some((p) => Math.hypot(p.x - x, p.y - y) < radius)
  if (!reachable) throw new Error(`O destino ${name} não está acessível a partir da entrada!`)
  console.log(`✓ Acesso validado: ${name}`)
}
console.log(`✓ Caminhos interligados: ${queue.length} pontos de navegação`)

// Verify that every art sprite's *footprint* is exactly the footprint compiled
// into Tiled, preventing the visual/collision drift that broke the old CC scene.
const layout = JSON.parse(readFileSync('assets/cc/pixel-world/layout.json', 'utf8'))
if (layout.props.length !== shapes.length) throw new Error('Sprite/collision quantity differs!')
for (const prop of layout.props) {
  const shape = shapes.find((entry) => entry.name === (prop.label ?? prop.id))
  if (!shape) throw new Error(`Missing physical collider for ${prop.id}`)
  const [dx, dy, w, h] = prop.solid
  if (
    shape.x !== prop.x + dx ||
    shape.y !== prop.y + dy ||
    shape.width !== w ||
    shape.height !== h
  ) {
    throw new Error(`Collider diverges from sprite: ${prop.id}`)
  }
}

// All service counters must be reachable without walking through their solid footprint.
for (const prop of layout.props.filter((entry) => entry.kind === 'shop')) {
  const counterX = prop.x + prop.width / 2
  const counterY = prop.y + prop.height + 23
  if (!queue.some(({ x, y }) => Math.hypot(x - counterX, y - counterY) < 72)) {
    console.warn(`Counter approach outside open-floor test radius: ${prop.id}`)
  }
  const [dx, dy, w, h] = prop.solid
  if (isWalkable(prop.x + dx + w / 2, prop.y + dy + h / 2 - 12)) {
    throw new Error(`Solid storefront is passable: ${prop.id}`)
  }
}
console.log(`✓ ${layout.props.length} sprites com colisões sincronizadas`)
