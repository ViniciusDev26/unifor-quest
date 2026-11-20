import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * The toolchains an installed game carries (ADR 0021, 0082), laid out by
 * scripts/fetch-runtimes.mjs and copied by electron-builder to `resources/runtimes/`
 * (ADR 0081). Each name is a folder with the same layout on every platform:
 * `go`, `jdk`, `python`, `erlang`, `elixir`, `elixir-ls`, `jdtls` and `gopls`, plus
 * `go-cache`, the warm GOCACHE the game seeds its own from (ADR 0083).
 */
export type BundledRuntime =
  | 'go'
  | 'jdk'
  | 'python'
  | 'erlang'
  | 'elixir'
  | 'elixir-ls'
  | 'jdtls'
  | 'gopls'
  | 'go-cache'

/**
 * The folder of a bundled runtime, or `undefined` in development (where every toolchain
 * comes from the environment, `mise.toml`) and when a packaged build somehow lacks it, so
 * the caller falls back to the environment and the failure names the tool.
 */
export function bundledRuntime(name: BundledRuntime): string | undefined {
  if (!app.isPackaged) {
    return undefined
  }
  const dir = join(process.resourcesPath, 'runtimes', name)
  return existsSync(dir) ? dir : undefined
}

/** `name` with `.exe` on Windows, as an executable inside a runtime's folder. */
export function executableName(name: string): string {
  return process.platform === 'win32' ? `${name}.exe` : name
}
