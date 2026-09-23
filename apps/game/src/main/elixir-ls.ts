import { execFileSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'
import { resolveWindowsBatch } from '@unifor-quest/runner'
import { env } from './env'

/**
 * Starts ElixirLS without needing anything the game does not already ship.
 *
 * The distribution's own `language_server.sh` launcher tries to detect a shell, a version
 * manager and the player's preferred shell to relaunch itself in — none of which exists
 * inside an Electron main process. `launch.exs` underneath all of that is a plain Elixir
 * script, so it is run directly with the same Elixir the game already carries to run Elixir
 * challenges — the server costs no second runtime, the same reasoning as jdtls (ADR 0051).
 */
export function elixirLsCommand(
  elixirExecutable: string,
  erlangBinDir: string,
): {
  executable: string
  args: string[]
  env: Record<string, string>
} | null {
  const install = findInstall()
  const launcher = install === undefined ? undefined : join(install, 'launch.exs')

  if (launcher === undefined || !existsSync(launcher)) {
    return null
  }

  // Elixir itself execs erl, and ElixirLS's installer step shells out to mix — both need to
  // find the runtime the game already resolved, not whatever is on PATH.
  const withPath = {
    ELS_MODE: 'language_server',
    PATH: `${erlangBinDir}${delimiter}${dirname(elixirExecutable)}${delimiter}${env.PATH ?? ''}`,
  }

  // elixir's own launcher is a `.bat` on Windows, which Node refuses to spawn directly
  // (see resolveWindowsBatch).
  const resolved = resolveWindowsBatch(elixirExecutable, [launcher], withPath)
  return { executable: resolved.executable, args: resolved.args, env: withPath }
}

/**
 * Where the server was unpacked. In development it is found through the `PATH`, by
 * following the launcher back to the directory that holds `launch.exs`; a packaged build
 * will point straight at the copy inside the app (ADR 0021).
 *
 * A version manager's shim is not always a symlink to the real script — mise's own shims
 * are small compiled wrappers, unlike a Homebrew or asdf install, so following one with
 * `realpath` lands back on itself instead of the real distribution. When that happens, mise
 * is asked directly: it is already the documented source of dev-time toolchains for this
 * project, the same role it plays for every `mise.toml` entry.
 */
function findInstall(): string | undefined {
  const launcherName = process.platform === 'win32' ? 'language_server.bat' : 'language_server.sh'

  for (const entry of (env.PATH ?? '').split(delimiter)) {
    if (entry === '') {
      continue
    }

    const candidate = join(entry, launcherName)
    if (existsSync(candidate)) {
      // The entry may be a symlink into the real distribution.
      const resolved = dirname(realpathSync(candidate))
      if (existsSync(join(resolved, 'launch.exs'))) {
        return resolved
      }
    }
  }

  try {
    const resolved = execFileSync('mise', ['where', 'elixir-ls'], { encoding: 'utf8' }).trim()

    if (resolved !== '' && existsSync(join(resolved, 'launch.exs'))) {
      return resolved
    }
  } catch {
    // No mise either: keep looking nowhere else, the failure will name the tool.
  }

  return undefined
}
