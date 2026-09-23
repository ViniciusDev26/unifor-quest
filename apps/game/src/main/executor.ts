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
function resolveToolchain(name: string): Toolchain {
  if (name === 'node') {
    return { executable: process.execPath, env: { ELECTRON_RUN_AS_NODE: '1' } }
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
