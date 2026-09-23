import { randomBytes } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'
import {
  type Command,
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
  /**
   * Arguments that belong to the installation rather than to the task — where a language
   * server keeps its data, for instance. They come before the command's own arguments.
   */
  args?: readonly string[]
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

/**
 * Generous on purpose. Compiling is bounded so a hung compiler cannot hang the game, but
 * the bound has to clear the worst honest case: a first Go build with a cold cache, which
 * compiles most of the standard library. The CI measured that going past twenty seconds on
 * Windows — which is also the evidence behind shipping a warm cache (ADR 0022).
 */
const DEFAULT_COMPILE_TIMEOUT_MS = 60_000
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
      playerFiles: request.playerFiles,
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
      const step = resolve(prepared.compile, cwd, options.resolveToolchain)
      const compiled = await spawnWithTimeout({
        executable: step.executable,
        args: step.args,
        cwd,
        env: { ...process.env, ...step.env },
        timeoutMs: compileTimeoutMs,
      })

      if (compiled.timedOut) {
        return failure('A compilacao demorou demais e foi interrompida.')
      }
      if (compiled.code !== 0) {
        return failure(relativeTo(cwd, compiled.stderr) || 'A compilacao falhou.')
      }
    }

    const step = resolve(prepared.run, cwd, options.resolveToolchain)
    const executed = await spawnWithTimeout({
      executable: step.executable,
      args: step.args,
      cwd,
      env: { ...process.env, ...step.env },
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
    return failure(
      relativeTo(cwd, executed.stderr) || `Nao foi possivel ler o resultado (${parsed.detail}).`,
    )
  }

  return { run }
}

/**
 * Turns a command into something spawnable: a logical toolchain becomes whatever the app
 * resolved it to, and an artifact is looked up inside the work directory the compile step
 * just wrote to.
 */
function resolve(
  command: Command,
  cwd: string,
  resolveToolchain: (name: string) => Toolchain,
): { executable: string; args: string[]; env: Record<string, string> | undefined } {
  if (command.kind === 'toolchain') {
    const toolchain = resolveToolchain(command.toolchain)
    return {
      executable: toolchain.executable,
      args: [...(toolchain.args ?? []), ...command.args],
      env: toolchain.env,
    }
  }
  return { executable: join(cwd, command.path), args: [...command.args], env: undefined }
}

/**
 * Strips the work directory out of whatever a toolchain printed.
 *
 * Compilers name files the way they were given them, and some give absolute paths: the
 * player would read `/home/…/.cache/unifor-quest/run/java/work/Solution.java:3` instead of
 * `Solution.java:3`. The path is ours, not theirs, and it is noise in the one message they
 * most need to read.
 */
function relativeTo(cwd: string, output: string): string {
  return output.split(`${cwd}${sep}`).join('').split(cwd).join('.').trim()
}

function failure(error: string): RunEnvelope {
  return { results: [], playerStdout: '', error }
}
