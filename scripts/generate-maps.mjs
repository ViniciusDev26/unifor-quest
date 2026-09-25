// Compiles every map description in content/maps/src into a real Tiled JSON file (ADR
// 0058): the same "generated files are never edited by hand" rule as the language
// templates (ADR 0005), just for content instead of code.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { bibliotecaDescription } from '../content/maps/src/biblioteca.mjs'
import { campusDescription } from '../content/maps/src/campus.mjs'
import { compileMap } from '../packages/campus/dist/index.js'

const descriptions = [campusDescription, bibliotecaDescription]

for (const description of descriptions) {
  const map = compileMap(description)
  const target = join('content', 'maps', `${description.id}.tmj`)
  writeFileSync(target, `${JSON.stringify(map, null, 2)}\n`, 'utf8')
  console.log(`compiled ${target}`)
}
