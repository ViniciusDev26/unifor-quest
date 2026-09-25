// The maps in content/maps/*.tmj are generated (ADR 0058), same promise as
// check-generated.mjs for language templates: regenerate, and a difference means someone
// edited a description in content/maps/src and forgot to regenerate.

import { execFileSync } from 'node:child_process'

execFileSync(process.execPath, ['scripts/generate-maps.mjs'], { stdio: 'inherit' })

const changed = execFileSync('git', ['status', '--porcelain', '--', 'content/maps/*.tmj'], {
  encoding: 'utf8',
}).trim()

if (changed !== '') {
  console.error(`Mapas desatualizados. Rode "npm run generate:maps" e commite:\n${changed}`)
  process.exit(1)
}

console.log('Mapas em content/maps/ estao em dia com as descricoes.')
