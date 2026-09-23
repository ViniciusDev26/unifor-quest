// Every relative link in the documentation has to point at something that exists.
//
// This project carries more decision records than code, and they cross-reference each other
// constantly. A renamed ADR silently breaking a dozen links is the kind of rot that makes
// people stop trusting the docs — so it is a gate, not a habit.

import { existsSync, globSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const files = [
  ...globSync('docs/**/*.md'),
  ...globSync('packages/*/README.md'),
  'CLAUDE.md',
  'README.md',
]

const broken = []

for (const file of files) {
  const contents = readFileSync(file, 'utf8')

  for (const match of contents.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
    const target = match[1]
    if (target === undefined || /^[a-z]+:/.test(target)) {
      continue
    }

    // A directory is a valid target: forges render its listing.
    if (!existsSync(resolve(join(dirname(file), target)))) {
      broken.push(`${file} -> ${target}`)
    }
  }
}

if (broken.length > 0) {
  console.error(`Links quebrados na documentacao:\n  ${broken.join('\n  ')}`)
  process.exit(1)
}

console.log(`${files.length} arquivos de documentacao, nenhum link quebrado.`)
