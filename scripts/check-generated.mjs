// The language templates are real `.go`, `.java`, `.py` and `.ex`/`.exs` files, embedded
// into TypeScript by a generate step (ADR 0042). The embedded copy is committed so that
// typecheck, test and build need no ordering — which means it can fall behind the template
// it came from.
//
// Regenerating and finding a difference means someone edited a template and forgot.

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const packages = ['lang-go', 'lang-java', 'lang-python', 'lang-elixir']

// Running the embed scripts with Node directly, rather than through `npm run`: Node refuses
// to spawn a `.cmd` without a shell since the Batbadbut fix, and `npm` on Windows is
// `npm.cmd`. Going straight to the script sidesteps the whole question, and is faster.
for (const name of packages) {
  execFileSync(process.execPath, [join('packages', name, 'scripts', 'embed-templates.mjs')], {
    stdio: 'inherit',
  })
}

const changed = execFileSync(
  'git',
  ['status', '--porcelain', '--', 'packages/*/src/*.generated.ts'],
  {
    encoding: 'utf8',
  },
).trim()

if (changed !== '') {
  console.error(
    `Arquivos gerados desatualizados. Rode "npm run generate -w <pacote>" e commite:\n${changed}`,
  )
  process.exit(1)
}

console.log('Arquivos gerados estao em dia com os templates.')
