import { randomBytes } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  type Executor,
  harnessInput,
  type LanguageAdapter,
  type LanguageId,
  parseEnvelope,
  type RunEnvelope,
  type RunRequest,
} from '@unifor-quest/core'
import { spawnWithTimeout } from './spawn-with-timeout.js'

/** A logical toolchain resolved to something that can actually be executed (ADR 0021). */
export type Toolchain = {
  executable: string
  env?: Record<string, string>
}

export type LocalExecutorOptions = {
  /**
   * Where generated files go. It is a cache directory, not the save directory, and it may
   * be wiped by the system at any time (ADR 0026).
   */
  workDir: string
  adapters: readonly LanguageAdapter[]
  resolveToolchain: (name: string) => Toolchain
  compileTimeoutMs?: number
  runTimeoutMs?: number
}

const DEFAULT_COMPILE_TIMEOUT_MS = 20_000
const DEFAULT_RUN_TIMEOUT_MS = 10_000

/**
 * Runs the player's code on the player's own machine, with no container (ADR 0010): the
 * risk being managed is an infinite loop and orphan processes, not malicious code.
 *
 * Always returns an envelope. A timeout, a crash or a harness that printed nothing all come
 * back as an envelope with `error` set — messages there are read by the player, so they are
 * in Portuguese (ADR 0031).
 */
export function createLocalExecutor(options: LocalExecutorOptions): Executor {
  const adapters = new Map<LanguageId, LanguageAdapter>(
    options.adapters.map((adapter) => [adapter.id, adapter]),
  )
  const compileTimeoutMs = options.compileTimeoutMs ?? DEFAULT_COMPILE_TIMEOUT_MS
  const runTimeoutMs = options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS

  async function run(request: RunRequest): Promise<RunEnvelope> {
    const adapter = adapters.get(request.language)
    if (adapter === undefined) {
      return failure(`Linguagem sem suporte: ${request.language}.`)
    }

    const nonce = randomBytes(16).toString('hex')
    const prepared = adapter.prepare({
      challenge: request.challenge,
      playerCode: request.playerCode,
      nonce,
    })

    const cwd = join(options.workDir, request.language, 'work')
    await rm(cwd, { recursive: true, force: true })
    await mkdir(cwd, { recursive: true })

    for (const file of prepared.files) {
      const target = join(cwd, file.path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, file.contents, 'utf8')
    }

    if (prepared.compile !== null) {
      const toolchain = options.resolveToolchain(prepared.compile.toolchain)
      const compiled = await spawnWithTimeout({
        executable: toolchain.executable,
        args: prepared.compile.args,
        cwd,
        env: { ...process.env, ...toolchain.env },
        timeoutMs: compileTimeoutMs,
      })

      if (compiled.timedOut) {
        return failure('A compilacao demorou demais e foi interrompida.')
      }
      if (compiled.code !== 0) {
        return failure(compiled.stderr.trim() || 'A compilacao falhou.')
      }
    }

    const toolchain = options.resolveToolchain(prepared.run.toolchain)
    const executed = await spawnWithTimeout({
      executable: toolchain.executable,
      args: prepared.run.args,
      cwd,
      env: { ...process.env, ...toolchain.env },
      stdin: harnessInput(request.challenge.cases),
      timeoutMs: runTimeoutMs,
    })

    if (executed.timedOut) {
      return failure('Seu codigo demorou demais. Talvez exista um laco que nunca termina.')
    }

    const parsed = parseEnvelope(executed.stdout, nonce)
    if (parsed.ok) {
      return parsed.envelope
    }

    // No envelope means the process died before printing one: a syntax error, a crash, or
    // something the harness could not survive. Whatever it printed on stderr is the best
    // explanation available.
    return failure(executed.stderr.trim() || `Nao foi possivel ler o resultado (${parsed.detail}).`)
  }

  return { run }
}

function failure(error: string): RunEnvelope {
  return { results: [], playerStdout: '', error }
}
