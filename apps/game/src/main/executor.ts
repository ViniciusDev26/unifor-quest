import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import type { Executor } from '@unifor-quest/core'
import { createLocalExecutor, type Toolchain } from '@unifor-quest/runner'
import { app } from 'electron'
import { adapters } from './adapters'
import { env } from './env'

/**
 * Where generated code and build caches live: a cache directory, never the save directory,
 * and never the Roaming profile on Windows (ADR 0026). The system may wipe it at any time.
 *
 * The paths are spelled out instead of taken from `app.getPath('cache')`, which is not part
 * of Electron's public typings, and because ADR 0026 fixes exactly these three.
 */
function cacheRoot(): string {
  const home = app.getPath('home')

  if (process.platform === 'win32') {
    return env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
  }
  if (process.platform === 'darwin') {
    return join(home, 'Library', 'Caches')
  }
  return env.XDG_CACHE_HOME ?? join(home, '.cache')
}

function workDir(): string {
  return join(cacheRoot(), 'unifor-quest', 'run')
}

/**
 * Resolves a logical toolchain to something executable (ADR 0021). In a packaged app this
 * will point into the bundled runtimes; today only TypeScript exists, and it costs nothing
 * to ship because Electron already carries Node — reused here through
 * `ELECTRON_RUN_AS_NODE`, which strips the types and runs the file.
 */
let cachedGo: string | undefined

/**
 * Finds the Go binary once, as an absolute path.
 *
 * Asking the environment for `go` is not enough. Version managers put a shim on the PATH
 * and the shim picks a version from the **current directory** — and the runner works in a
 * cache directory far outside the project (ADR 0026), where there is no configuration to
 * find. The shim then fails with "no version is set", and the player sees that instead of
 * a compiler error.
 *
 * So the lookup happens once, from the app's own directory, and asks Go where it lives.
 * Everything after that uses the absolute path and stops caring about the working
 * directory. A packaged build will point straight at the bundled runtime (ADR 0021).
 */
function goExecutable(): string {
  if (cachedGo !== undefined) {
    return cachedGo
  }

  cachedGo = 'go'
  try {
    const root = execFileSync('go', ['env', 'GOROOT'], {
      cwd: app.getAppPath(),
      encoding: 'utf8',
    }).trim()

    if (root !== '') {
      cachedGo = join(root, 'bin', process.platform === 'win32' ? 'go.exe' : 'go')
    }
  } catch {
    // No Go on the PATH either: keep the bare name so the failure mentions the toolchain.
  }

  return cachedGo
}

function resolveToolchain(name: string): Toolchain {
  if (name === 'node') {
    return { executable: process.execPath, env: { ELECTRON_RUN_AS_NODE: '1' } }
  }

  if (name === 'go') {
    return {
      executable: goExecutable(),
      env: {
        // No C compiler is ever required on the player's machine (ADR 0022).
        CGO_ENABLED: '0',
        // Never try to download a different toolchain: the game ships the one it uses.
        GOTOOLCHAIN: 'local',
        // Writable, and in the cache directory — the app bundle is read only (ADR 0026).
        GOCACHE: join(workDir(), 'go', 'cache'),
        GOMODCACHE: join(workDir(), 'go', 'modcache'),
        GOFLAGS: '-mod=mod',
      },
    }
  }

  throw new Error(`Unknown toolchain: ${name}`)
}

export function createExecutor(): Executor {
  return createLocalExecutor({
    workDir: workDir(),
    adapters,
    resolveToolchain,
  })
}
