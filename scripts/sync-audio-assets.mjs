// Copies the curated audio (assets/audio/, vendor-dropped, CC0 — see LICENSE.txt next to
// each pack) into apps/game/public/audio/, mirroring the subpath. Same reason as
// sync-map-assets.mjs: the renderer only loads from its own served root at runtime.

import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE = join('assets', 'audio')
const TARGET = join('apps', 'game', 'src', 'renderer', 'public', 'audio')

function copyOggFiles(from, to) {
  mkdirSync(to, { recursive: true })
  for (const entry of readdirSync(from)) {
    const fromPath = join(from, entry)
    const toPath = join(to, entry)
    if (statSync(fromPath).isDirectory()) {
      copyOggFiles(fromPath, toPath)
      continue
    }
    if (!entry.endsWith('.ogg')) {
      continue
    }
    copyFileSync(fromPath, toPath)
    console.log(`copied ${toPath}`)
  }
}

copyOggFiles(SOURCE, TARGET)
