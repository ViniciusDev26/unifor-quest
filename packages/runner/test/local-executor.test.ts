import { afterEach, describe, expect, it } from 'vitest'
import { resolveWindowsBatch } from '../src/local-executor.js'

/**
 * `.bat`/`.cmd` is the one shape of toolchain launcher this project has to spawn
 * differently — Elixir's own launcher on Windows (ADR 0056). `process.platform` is
 * overridden per test rather than mocked through `vi`, since it is a plain data property on
 * a real Node global, not a module import.
 */
describe('resolveWindowsBatch', () => {
  const realPlatform = process.platform

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: realPlatform })
  })

  it('leaves a non-batch executable alone, on any platform', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    expect(resolveWindowsBatch('elixir.exe', ['harness.exs'], undefined)).toEqual({
      executable: 'elixir.exe',
      args: ['harness.exs'],
      env: undefined,
    })
  })

  it('leaves a .bat executable alone outside Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    expect(resolveWindowsBatch('elixir.bat', ['harness.exs'], undefined)).toEqual({
      executable: 'elixir.bat',
      args: ['harness.exs'],
      env: undefined,
    })
  })

  it('wraps a .bat launcher through cmd.exe on Windows, args intact', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    expect(resolveWindowsBatch('elixir.bat', ['harness.exs'], { FOO: 'bar' })).toEqual({
      executable: 'cmd.exe',
      args: ['/d', '/s', '/c', 'elixir.bat', 'harness.exs'],
      env: { FOO: 'bar' },
    })
  })

  it('wraps a .cmd launcher the same way, case-insensitively', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    expect(resolveWindowsBatch('launch.CMD', [], undefined)).toEqual({
      executable: 'cmd.exe',
      args: ['/d', '/s', '/c', 'launch.CMD'],
      env: undefined,
    })
  })
})
