// Copies the map art the game actually uses from assets/ (vendor-dropped, kept as the one
// source), and the compiled maps from content/maps/, into apps/game/public/ (ADR 0058): the
// renderer's CSP is `img-src 'self'`, so anything the game loads at runtime — an image or
// a .tmj — has to live under the app's own served root, not an arbitrary path on disk.

import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ASSETS = join('assets', 'graphics', 'graphics')
const MAPS = join('content', 'maps')
// electron-vite's renderer root is apps/game/src/renderer (where index.html lives), and
// Vite's public dir defaults to <root>/public relative to that, not to the package root.
const TARGET = join('apps', 'game', 'src', 'renderer', 'public')

const TILESETS = ['world', 'indoor']
const OBJECTS = [
  'house_large',
  'house_large_alt',
  'house_small',
  'house_small_alt',
  'hospital',
  'gate_pillar',
]
const CHARACTERS = ['player']

function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
  console.log(`copied ${to}`)
}

for (const name of TILESETS) {
  copy(join(ASSETS, 'tilesets', `${name}.png`), join(TARGET, 'tilesets', `${name}.png`))
}
for (const name of OBJECTS) {
  copy(join(ASSETS, 'objects', `${name}.png`), join(TARGET, 'objects', `${name}.png`))
}
for (const name of CHARACTERS) {
  copy(join(ASSETS, 'characters', `${name}.png`), join(TARGET, 'characters', `${name}.png`))
}
for (const name of readdirSync(MAPS).filter((f) => f.endsWith('.tmj'))) {
  copy(join(MAPS, name), join(TARGET, 'maps', name))
}
