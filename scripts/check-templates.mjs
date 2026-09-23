// The harness and the graph prelude of each language are real files of that language, and
// the promise of ADR 0042 is that the language's own compiler checks them on every build.
//
// Nothing was enforcing that promise: the templates are only exercised indirectly, when a
// challenge happens to use them. This compiles each template package on its own.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = mkdtempSync(join(tmpdir(), 'unifor-quest-templates-'))

const checks = [
  {
    language: 'go',
    directory: 'packages/lang-go/templates',
    command: 'go',
    args: ['build', '-o', join(out, 'go-templates'), '.'],
    probe: ['version'],
    env: {},
  },
  {
    language: 'java',
    directory: 'packages/lang-java/templates',
    command: 'javac',
    args: [
      '-d',
      join(out, 'java-templates'),
      'Harness.java',
      'Json.java',
      'Graph.java',
      'Solution.java',
    ],
    probe: ['-version'],
    env: {},
  },
  {
    language: 'python',
    directory: 'packages/lang-python/templates',
    command: 'python3',
    args: ['-m', 'compileall', '-q', '.'],
    // Bytecode would otherwise be written next to the sources and dirty the tree.
    env: { PYTHONPYCACHEPREFIX: join(out, 'pycache') },
    probe: ['--version'],
  },
  {
    language: 'elixir',
    directory: 'packages/lang-elixir/templates',
    command: 'elixir',
    // The harness pulls in graph.ex and solution.ex itself (ADR 0056), so running it with
    // an empty case list checks all three files at once — syntax and the default invoke.
    args: ['harness.exs'],
    input: '[]',
    probe: ['--version'],
    env: {},
  },
]

let failed = false

for (const check of checks) {
  if (!existsSync(check.directory)) {
    continue
  }

  const installed = spawnSync(check.command, check.probe, { encoding: 'utf8' })
  if (installed.error !== undefined) {
    console.log(`${check.language}: toolchain ausente, pulado`)
    continue
  }

  const result = spawnSync(check.command, check.args, {
    cwd: check.directory,
    encoding: 'utf8',
    env: { ...process.env, ...check.env },
    ...(check.input === undefined ? {} : { input: check.input }),
  })

  if (result.status !== 0) {
    failed = true
    console.error(`${check.language}: os templates nao compilam\n${result.stderr ?? ''}`)
  } else {
    console.log(`${check.language}: templates ok`)
  }
}

rmSync(out, { recursive: true, force: true })

if (failed) {
  process.exit(1)
}
