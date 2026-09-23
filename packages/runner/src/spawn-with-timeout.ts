import { spawn } from 'node:child_process'
import { killTree } from './kill-tree.js'

export type SpawnOptions = {
  executable: string
  args: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  stdin?: string
  timeoutMs: number
}

export type SpawnOutcome = {
  code: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

/**
 * Runs one command and comes back with everything it printed. On a timeout the whole
 * process tree is killed, never just the parent (ADR 0009).
 */
export function spawnWithTimeout(options: SpawnOptions): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    const child = spawn(options.executable, options.args, {
      cwd: options.cwd,
      env: options.env,
      // Its own process group, so the whole tree can be taken down at once.
      detached: process.platform !== 'win32',
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false

    const timer = setTimeout(() => {
      timedOut = true
      if (child.pid !== undefined) {
        killTree(child.pid)
      }
    }, options.timeoutMs)

    const finish = (code: number | null): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut })
    }

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', (cause) => {
      stderr += String(cause)
      finish(null)
    })
    child.on('close', finish)

    if (options.stdin !== undefined) {
      child.stdin.end(options.stdin)
    } else {
      child.stdin.end()
    }
  })
}
