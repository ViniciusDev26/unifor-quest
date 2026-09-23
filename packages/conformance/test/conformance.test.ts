import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import type { LanguageAdapter } from '@unifor-quest/core'
import { elixirAdapter } from '@unifor-quest/lang-elixir'
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
 *
 * In CI that leniency is a trap: a toolchain that fails to install would quietly halve the
 * coverage and the build would still be green. `CONFORMANCE_REQUIRE_ALL` turns a skip into
 * a failure, and CI sets it.
 */
const requireAll = process.env['CONFORMANCE_REQUIRE_ALL'] === '1'

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

const windows = process.platform === 'win32'
const exe = (name: string): string => (windows ? `${name}.exe` : name)

const goBin = resolved('go', ['env', 'GOROOT'], (out) => join(out.trim(), 'bin', exe('go')))
const javaBin = resolved('java', ['-XshowSettings:properties', '-version'], (out) =>
  join(/java\.home\s*=\s*(.+)/.exec(out)?.[1]?.trim() ?? '', 'bin', exe('java')),
)
// Windows installs it as `python`; elsewhere `python3` is the one that is not Python 2.
const pythonBin =
  resolved('python3', ['-c', 'import sys; print(sys.executable)'], (out) => out) ??
  resolved('python', ['-c', 'import sys; print(sys.executable)'], (out) => out)

/**
 * Neither `elixir` nor `erl` has a subcommand that prints its own installation root, unlike
 * Go or Java — and `elixir` cannot even run to be asked, since it execs `erl` by bare name
 * first. mise is asked directly instead, the same fallback `apps/game`'s own resolver uses
 * (ADR 0056): it is the project's documented source of dev-time toolchains either way.
 *
 * CI has no mise — `erlef/setup-beam` puts `erl` and `elixir` straight on `PATH`, which is
 * fine there: a GitHub Actions runner has no per-project version-manager shim picking a
 * version by directory, so ADR 0043's problem does not apply and the bare name is already
 * stable. `erl +V` is the installed-or-not probe for that case.
 */
const erlangRoot = resolved('mise', ['where', 'erlang'], (out) => out)
const elixirRoot = resolved('mise', ['where', 'elixir'], (out) => out)
const elixirBin = elixirRoot === null ? null : join(elixirRoot, 'bin', exe('elixir'))
const erlangBinDir = erlangRoot === null ? null : join(erlangRoot, 'bin')
const erlOnPath = spawnSync('erl', ['+V'], { encoding: 'utf8' }).error === undefined
const elixirInstalled = (elixirBin !== null && erlangBinDir !== null) || erlOnPath

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
    case 'elixir':
      return {
        executable: elixirBin ?? 'elixir',
        env: { PATH: `${erlangBinDir ?? ''}${delimiter}${process.env['PATH'] ?? ''}` },
      }
    default:
      throw new Error(`Unknown toolchain: ${name}`)
  }
}

const candidates: { adapter: LanguageAdapter; installed: boolean }[] = [
  { adapter: typescriptAdapter, installed: true },
  { adapter: goAdapter, installed: goBin !== null },
  { adapter: javaAdapter, installed: javaBin !== null },
  { adapter: pythonAdapter, installed: pythonBin !== null },
  { adapter: elixirAdapter, installed: elixirInstalled },
]

describe('conformance', () => {
  it('encontra o toolchain de todas as linguagens quando exigido', () => {
    const missing = candidates.filter((one) => !one.installed).map((one) => one.adapter.id)
    expect(requireAll ? missing : []).toEqual([])
  })

  for (const { adapter, installed } of candidates) {
    // The four languages do not touch each other, so they run side by side.
    const run = installed ? it.concurrent : it.skip

    run(
      `${adapter.id} passa em todos os cenarios`,
      async () => {
        const report = await runConformance(adapter, (runTimeoutMs) =>
          createLocalExecutor({
            workDir: join(workDir, adapter.id),
            adapters: [adapter],
            resolveToolchain,
            runTimeoutMs,
          }),
        )
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
