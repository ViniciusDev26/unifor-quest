// The maps in content/maps/*.tmj are generated (ADR 0058), same promise as
// check-generated.mjs for language templates: regenerate, and a difference means someone
// edited a description in content/maps/src and forgot to regenerate.

import { execFileSync } from 'node:child_process'

execFileSync(process.execPath, ['scripts/generate-maps.mjs'], { stdio: 'inherit' })

const changed = execFileSync('git', ['status', '--porcelain', '--', 'content/maps/*.tmj'], {
  encoding: 'utf8',
}).trim()

if (changed !== '') {
  console.error(`Maps out of date. Run "npm run generate:maps" and commit:\n${changed}`)
  process.exit(1)
}

console.log('Maps in content/maps/ are up to date with their descriptions.')
