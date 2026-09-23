import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { LanguageAdapter } from '@unifor-quest/core'
import { goAdapter } from '@unifor-quest/lang-go'
import { javaAdapter } from '@unifor-quest/lang-java'
import { pythonAdapter } from '@unifor-quest/lang-python'
import { typescriptAdapter } from '@unifor-quest/lang-typescript'
import { createLocalExecutor, type Toolchain } from '@unifor-quest/runner'
import { afterAll, describe, expect, it } from 'vitest'
import { runConformance } from '../src/run.js'
import { scenarios } from '../src/scenarios.js'

/**
 * The conformance suite, run for real: every adapter, every scenario, against the actual
 * toolchains (ADR 0015).
 *
 * A language whose toolchain is not installed is skipped rather than failed — the suite has
 * to be runnable on a machine that only has Node, and saying "skipped" is honest where
 * "passed" would not be.
 */

const workDir = mkdtempSync(join(tmpdir(), 'unifor-quest-conformance-'))

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

/**
 * Resolves a toolchain to an absolute path, once, from the project directory.
 *
 * Exactly the problem of ADR 0043, and the conformance suite is where it bit: a version
 * manager puts a shim on the PATH, the shim picks a version from the current directory, and
 * the runner works in a temporary directory far from any configuration. Asking the tool
 * where it lives — from here, where the configuration is — settles it.
 */
function resolved(
  command: string,
  args: string[],
  read: (output: string) => string,
): string | null {
  // Both streams: `java -XshowSettings` prints to stderr, and reading only stdout would
  // silently skip the language most likely to break.
  const attempt = spawnSync(command, args, { encoding: 'utf8' })
  if (attempt.error !== undefined) {
    return null
  }

  const found = read(`${attempt.stdout ?? ''}${attempt.stderr ?? ''}`).trim()
  return found !== '' && existsSync(found) ? found : null
}

const goBin = resolved('go', ['env', 'GOROOT'], (out) => join(out.trim(), 'bin', 'go'))
const javaBin = resolved('java', ['-XshowSettings:properties', '-version'], (out) =>
  join(/java\.home\s*=\s*(.+)/.exec(out)?.[1]?.trim() ?? '', 'bin', 'java'),
)
const pythonBin = resolved('python3', ['-c', 'import sys; print(sys.executable)'], (out) => out)

function resolveToolchain(name: string): Toolchain {
  switch (name) {
    case 'node':
      return { executable: process.execPath }
    case 'go':
      return {
        executable: goBin ?? 'go',
        env: {
          CGO_ENABLED: '0',
          GOTOOLCHAIN: 'local',
          GOCACHE: join(workDir, 'go-cache'),
          GOMODCACHE: join(workDir, 'go-mod'),
          GOFLAGS: '-mod=mod',
        },
      }
    case 'java':
      return { executable: javaBin ?? 'java' }
    case 'python':
      return { executable: pythonBin ?? 'python3' }
    default:
      throw new Error(`Unknown toolchain: ${name}`)
  }
}

const candidates: { adapter: LanguageAdapter; installed: boolean }[] = [
  { adapter: typescriptAdapter, installed: true },
  { adapter: goAdapter, installed: goBin !== null },
  { adapter: javaAdapter, installed: javaBin !== null },
  { adapter: pythonAdapter, installed: pythonBin !== null },
]

describe('conformance', () => {
  for (const { adapter, installed } of candidates) {
    const run = installed ? it : it.skip

    run(
      `${adapter.id} passa em todos os cenarios`,
      async () => {
        const executor = createLocalExecutor({
          workDir: join(workDir, adapter.id),
          adapters: [adapter],
          resolveToolchain,
        })

        const report = await runConformance(adapter, executor)
        const failures = report.outcomes
          .filter((outcome) => !outcome.passed)
          .map((outcome) => `${outcome.scenario}\n    ${outcome.problems.join('\n    ')}`)

        expect(failures, `\n${failures.join('\n  ')}\n`).toEqual([])
        expect(report.outcomes).toHaveLength(scenarios.length)
      },
      180_000,
    )
  }
})
