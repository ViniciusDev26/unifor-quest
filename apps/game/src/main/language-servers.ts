import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Challenge, LanguageId } from '@unifor-quest/core'
import { type LanguageServerProcess, startLanguageServer } from '@unifor-quest/lsp'
import { lspMessageSchema } from '@unifor-quest/lsp/protocol'
import type { WebContents } from 'electron'
import { adapterFor } from './adapters'
import { resolveToolchain, workDir } from './executor'

export const LSP_START_CHANNEL = 'lsp:start'
export const LSP_SEND_CHANNEL = 'lsp:send'
export const LSP_STOP_CHANNEL = 'lsp:stop'
export const LSP_MESSAGE_EVENT = 'lsp:message'

export type LanguageServerHandle = {
  rootUri: string
  documentUri: string
  documentLanguageId: string
}

type Running = LanguageServerHandle & { process: LanguageServerProcess }

const running = new Map<LanguageId, Running>()

/**
 * The editing workspace is separate from the one runs happen in.
 *
 * A language server needs a stable project on disk to make sense of a file, and the run
 * directory is wiped before every execution (ADR 0026). So editing gets its own folder,
 * written once, and the server keeps the player's unsaved text in memory as the document
 * changes.
 */
function workspaceDir(language: LanguageId): string {
  return join(workDir(), 'edit', language)
}

/**
 * Starts the language server for a language, if that language has one — TypeScript does
 * not, because Monaco already embeds a full service for it (ADR 0044).
 */
export function startFor(
  language: LanguageId,
  challenge: Challenge,
  sender: WebContents,
): LanguageServerHandle | null {
  const existing = running.get(language)
  if (existing !== undefined) {
    const { rootUri, documentUri, documentLanguageId } = existing
    return { rootUri, documentUri, documentLanguageId }
  }

  const declared = adapterFor(language)?.languageServer?.({ challenge })
  if (declared === undefined) {
    return null
  }

  if (declared.command.kind !== 'toolchain') {
    return null
  }

  const cwd = workspaceDir(language)
  for (const file of declared.workspaceFiles) {
    const target = join(cwd, file.path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, file.contents, 'utf8')
  }

  const toolchain = resolveToolchain(declared.command.toolchain)
  const process = startLanguageServer({
    executable: toolchain.executable,
    args: declared.command.args,
    cwd,
    ...(toolchain.env === undefined ? {} : { env: toolchain.env }),
    onMessage(message) {
      if (!sender.isDestroyed()) {
        sender.send(LSP_MESSAGE_EVENT, { language, message })
      }
    },
    onExit(detail) {
      running.delete(language)
      if (!sender.isDestroyed()) {
        sender.send(LSP_MESSAGE_EVENT, { language, exit: detail })
      }
    },
  })

  const handle: LanguageServerHandle = {
    rootUri: pathToFileURL(cwd).href,
    documentUri: pathToFileURL(join(cwd, declared.documentPath)).href,
    documentLanguageId: declared.documentLanguageId,
  }

  running.set(language, { ...handle, process })
  return handle
}

/** Anything arriving over IPC is validated before it reaches the server (ADR 0017). */
export function sendTo(language: LanguageId, message: unknown): void {
  const parsed = lspMessageSchema.safeParse(message)
  if (parsed.success) {
    running.get(language)?.process.send(parsed.data)
  }
}

export function stopAll(): void {
  for (const server of running.values()) {
    server.process.stop()
  }
  running.clear()
}
