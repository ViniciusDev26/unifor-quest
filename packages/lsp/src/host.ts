import { spawn } from 'node:child_process'
import { createFrameReader, encodeFrame } from './framing.js'
import type { LspMessage } from './protocol.js'

export type LanguageServerProcess = {
  send: (message: LspMessage) => void
  stop: () => void
}

export type StartOptions = {
  executable: string
  args: string[]
  cwd: string
  env?: Record<string, string>
  onMessage: (message: LspMessage) => void
  /** Called when the server dies, with whatever it left on stderr. */
  onExit: (detail: string) => void
}

export function startLanguageServer(options: StartOptions): LanguageServerProcess {
  const child = spawn(options.executable, options.args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let stderr = ''
  const reader = createFrameReader(options.onMessage)

  child.stdout.on('data', (chunk: Buffer) => {
    reader.push(chunk)
  })

  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })

  child.on('error', (cause) => {
    options.onExit(String(cause))
  })

  child.on('close', () => {
    options.onExit(stderr.trim())
  })

  return {
    send(message) {
      if (child.stdin.destroyed) {
        return
      }
      child.stdin.write(encodeFrame(message))
    },

    stop() {
      // Closing stdin is how a language server is asked to go away; the kill is for the
      // one that does not take the hint.
      child.stdin.end()
      const forced = setTimeout(() => child.kill('SIGKILL'), 1_000)
      forced.unref()
      child.once('close', () => clearTimeout(forced))
    },
  }
}
