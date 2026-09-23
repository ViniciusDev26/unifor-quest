// The language templates are real `.go`, `.java` and `.py` files, embedded into TypeScript
// by a generate step (ADR 0042). The embedded copy is committed so that typecheck, test and
// build need no ordering — which means it can fall behind the template it came from.
//
// Regenerating and finding a difference means someone edited a template and forgot.

import { execFileSync } from 'node:child_process'

// On Windows the executable is `npm.cmd`, and execFileSync does not go through a shell.
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const packages = ['lang-go', 'lang-java', 'lang-python']

for (const name of packages) {
  execFileSync(npm, ['run', 'generate', '-w', `@unifor-quest/${name}`], { stdio: 'inherit' })
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
