// Every decision record has to appear in the index, and no two may share a number.
//
// The index in docs/decisions/README.md is how anyone finds a decision without reading
// fifty files, and it is maintained by hand — so it rots quietly. The duplicate-number
// check matters for a different reason: two branches each adding "the next ADR" pick the
// same number, and git merges both without complaining.

import { globSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'

const index = readFileSync('docs/decisions/README.md', 'utf8')
const records = globSync('docs/decisions/[0-9]*.md')
  .map((path) => basename(path))
  .sort()

const missing = records.filter((name) => !index.includes(`(${name})`))

const seen = new Map()
const duplicated = []

for (const name of records) {
  const number = name.slice(0, 4)
  const previous = seen.get(number)
  if (previous !== undefined) {
    duplicated.push(`${number}: ${previous} e ${name}`)
  }
  seen.set(number, name)
}

const problems = [
  ...missing.map((name) => `fora do indice: ${name}`),
  ...duplicated.map((clash) => `numero repetido — ${clash}`),
]

if (problems.length > 0) {
  console.error(`Indice de ADRs:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}

console.log(`${records.length} ADRs, todas no indice e sem numero repetido.`)
