import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'
import type { Executor } from '@unifor-quest/core'
import { createLocalExecutor, type Toolchain } from '@unifor-quest/runner'
import { app } from 'electron'
import { adapters } from './adapters'
import { env } from './env'
import { jdtlsCommand } from './jdtls'

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

export function workDir(): string {
  return join(cacheRoot(), 'unifor-quest', 'run')
}

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

let cachedGopls: string | undefined

/**
 * The Go language server, resolved the same way as the compiler and for the same reason
 * (ADR 0043): `go env GOPATH` tells where `go install` puts it.
 */
function goplsExecutable(): string {
  if (cachedGopls !== undefined) {
    return cachedGopls
  }

  cachedGopls = process.platform === 'win32' ? 'gopls.exe' : 'gopls'
  try {
    const gopath = execFileSync(goExecutable(), ['env', 'GOPATH'], {
      cwd: app.getAppPath(),
      encoding: 'utf8',
    }).trim()

    const candidate = join(gopath, 'bin', cachedGopls)
    if (gopath !== '' && existsSync(candidate)) {
      cachedGopls = candidate
    }
  } catch {
    // Not installed: keep the bare name so the failure names the tool.
  }

  return cachedGopls
}

let cachedJava: string | undefined

/**
 * Finds the Java launcher, absolute, for the reason in ADR 0043: a version manager's shim
 * picks a version from the current directory, and the runner works far outside the project.
 *
 * Java has no `env` subcommand, so it is asked to print its settings — `java.home` is the
 * installation it is running from.
 */
function javaExecutable(): string {
  if (cachedJava !== undefined) {
    return cachedJava
  }

  const launcher = process.platform === 'win32' ? 'java.exe' : 'java'
  cachedJava = launcher

  try {
    // These settings go to stderr, and the command exits after printing the version.
    const settings = execFileSync(launcher, ['-XshowSettings:properties', '-version'], {
      cwd: app.getAppPath(),
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'pipe'],
    })

    const home = /java\.home\s*=\s*(.+)/.exec(settings)?.[1]?.trim()
    if (home !== undefined && home !== '') {
      const candidate = join(home, 'bin', launcher)
      if (existsSync(candidate)) {
        cachedJava = candidate
      }
    }
  } catch {
    // Not installed: keep the bare name so the failure names the tool.
  }

  return cachedJava
}

/**
 * Resolves a logical toolchain to something executable (ADR 0021). In development each one
 * comes from the environment; a packaged build points at the copies shipped inside the app,
 * and the player installs nothing (ADR 0046, ADR 0051).
 */
export function resolveToolchain(name: string): Toolchain {
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

  if (name === 'gopls') {
    return {
      executable: goplsExecutable(),
      // gopls shells out to `go`, so it needs to find the same one the runner uses.
      env: { PATH: `${dirname(goExecutable())}${delimiter}${env.PATH ?? ''}` },
    }
  }

  if (name === 'java') {
    return { executable: javaExecutable() }
  }

  if (name === 'jdtls') {
    // The index goes in the cache, which is writable and disposable (ADR 0026).
    const command = jdtlsCommand(javaExecutable(), join(workDir(), 'jdtls-data'))
    if (command === null) {
      throw new Error('jdtls nao encontrado')
    }
    return command
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
