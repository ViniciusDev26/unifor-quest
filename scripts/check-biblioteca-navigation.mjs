// Dependency-free navigation check for the Biblioteca (Quest 2), same idea as
// check-cc-navigation.mjs: walk the compiled map with the player's real feet box and make
// sure Dona Célia and the door can be reached, and that every collider is exactly the
// footprint of the sprite drawn there.
import { readFileSync } from 'node:fs'

const map = JSON.parse(readFileSync('content/maps/biblioteca.tmj', 'utf8'))
const layout = JSON.parse(readFileSync('assets/biblioteca/pixel-world/layout.json', 'utf8'))
const floor = map.layers.find((layer) => layer.name === 'ground').data
const shapes = map.layers.find((layer) => layer.name === 'buildings').objects
const T = 16

// player.ts: feet box 14x8, 12px below the sprite's centre.
const feetAt = (x, y) => ({ x: x - 7, y: y + 12, width: 14, height: 8 })
const overlaps = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
const [celiaX, celiaY] = layout.npcs['Dona Célia']
const celiaBox = { x: celiaX - 12, y: celiaY - 12, width: 24, height: 24 }

function isWalkable(x, y) {
  const feet = feetAt(x, y)
  for (const [px, py] of [
    [feet.x, feet.y],
    [feet.x + feet.width, feet.y],
    [feet.x, feet.y + feet.height],
    [feet.x + feet.width, feet.y + feet.height],
  ]) {
    const tx = Math.floor(px / T)
    const ty = Math.floor(py / T)
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false
    if (floor[tx + ty * map.width] === 0) return false
  }
  return !shapes.some((shape) => overlaps(feet, shape)) && !overlaps(feet, celiaBox)
}

const [spawnX, spawnY] = layout.spawn
if (!isWalkable(spawnX, spawnY)) throw new Error('The Biblioteca entry point is blocked!')

const step = 4
const queue = [{ x: spawnX, y: spawnY }]
const visited = new Set([`${spawnX},${spawnY}`])
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

// Distances match biblioteca-scene.ts (TALK_DISTANCE, EXIT_DISTANCE).
const [doorX, doorY] = layout.door
for (const [name, x, y, radius] of [
  ['Dona Célia', celiaX, celiaY, 72],
  ['Door', doorX, doorY, 34],
]) {
  if (!queue.some((p) => Math.hypot(p.x - x, p.y - y) < radius)) {
    throw new Error(`${name} is not reachable from the entrance!`)
  }
  console.log(`✓ Reachable: ${name}`)
}
// The player must not be able to walk round the counter and stand next to her.
if (queue.some((p) => p.y < celiaY + 8 && Math.abs(p.x - celiaX) < 60)) {
  throw new Error('The player can get behind the counter!')
}
console.log('✓ Counter closed: nobody gets behind it')

for (const prop of layout.props) {
  const boxes = [prop.solid, ...(prop.extraSolids ?? [])].filter(([, , w, h]) => w > 0 && h > 0)
  for (const [index, [dx, dy, w, h]] of boxes.entries()) {
    const name = index === 0 ? prop.id : `${prop.id}-${index}`
    const shape = shapes.find((entry) => entry.name === name)
    if (shape === undefined) throw new Error(`Missing collider for ${name}`)
    if (
      shape.x !== prop.x + dx ||
      shape.y !== prop.y + dy ||
      shape.width !== w ||
      shape.height !== h
    ) {
      throw new Error(`Collider diverges from sprite: ${name}`)
    }
  }
}
console.log(`✓ ${shapes.length} colliders match the sprites`)
console.log(`✓ Paths connected: ${queue.length} navigation points`)
