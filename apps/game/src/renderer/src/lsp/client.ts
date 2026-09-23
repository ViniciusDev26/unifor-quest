import type { Challenge, LanguageId } from '@unifor-quest/core'
import {
  type Diagnostic,
  type LspMessage,
  lspMessageSchema,
  publishDiagnosticsSchema,
  type RequestId,
} from '@unifor-quest/lsp/protocol'

export type LspClient = {
  documentUri: string
  documentLanguageId: string
  /** Tells the server what the document says now. Full text: simple and fast enough here. */
  update: (text: string) => void
  request: (method: string, params: unknown) => Promise<unknown>
  onDiagnostics: (listener: (diagnostics: Diagnostic[]) => void) => void
}

type Pending = (message: LspMessage) => void

/**
 * What the editor shows about the language server. The player should be able to tell the
 * difference between "the server has nothing to say about your code" and "the server is
 * not running", which look identical otherwise (ADR 0044).
 */
export type LspStatus = 'none' | 'starting' | 'ready' | 'stopped' | 'failed'

const statuses = new Map<LanguageId, LspStatus>()
const statusListeners: ((language: LanguageId, status: LspStatus) => void)[] = []

export function lspStatus(language: LanguageId): LspStatus {
  return statuses.get(language) ?? 'none'
}

export function onLspStatusChange(
  listener: (language: LanguageId, status: LspStatus) => void,
): void {
  statusListeners.push(listener)
}

function setStatus(language: LanguageId, status: LspStatus): void {
  statuses.set(language, status)
  for (const listener of statusListeners) {
    listener(language, status)
  }
}

const clients = new Map<LanguageId, LspClient>()
const inboxes = new Map<LanguageId, (message: LspMessage) => void>()

let subscribed = false

/** One subscription for every server; the payload says which language it came from. */
function subscribeOnce(): void {
  if (subscribed) {
    return
  }
  subscribed = true

  window.api.onLanguageServerMessage((payload: unknown) => {
    const envelope = payload as { language?: unknown; message?: unknown; exit?: unknown }
    const language = envelope.language
    if (typeof language !== 'string') {
      return
    }

    const id = language as LanguageId

    if (envelope.exit !== undefined) {
      clients.delete(id)
      inboxes.delete(id)
      setStatus(id, envelope.exit === '' ? 'stopped' : 'failed')
      return
    }

    const parsed = lspMessageSchema.safeParse(envelope.message)
    if (parsed.success) {
      inboxes.get(id)?.(parsed.data)
    }
  })
}

export function clientFor(language: LanguageId): LspClient | undefined {
  return clients.get(language)
}

/**
 * Connects to the language server for a language, or answers `null` when that language has
 * none — TypeScript is the case, because Monaco already embeds a service for it (ADR 0044).
 *
 * The connection is made once per language and reused: starting `gopls` costs an index of
 * the standard library, and doing that on every language switch would be felt.
 */
export async function connect(
  language: LanguageId,
  challenge: Challenge,
): Promise<LspClient | null> {
  const existing = clients.get(language)
  if (existing !== undefined) {
    return existing
  }

  subscribeOnce()
  setStatus(language, 'starting')

  const handle = (await window.api.startLanguageServer({ challenge, language })) as {
    rootUri?: unknown
    documentUri?: unknown
    documentLanguageId?: unknown
  } | null

  if (
    handle === null ||
    typeof handle.rootUri !== 'string' ||
    typeof handle.documentUri !== 'string' ||
    typeof handle.documentLanguageId !== 'string'
  ) {
    setStatus(language, 'none')
    return null
  }

  const { rootUri, documentUri, documentLanguageId } = handle
  const pending = new Map<RequestId, Pending>()
  const diagnosticListeners: ((diagnostics: Diagnostic[]) => void)[] = []
  let nextId = 1
  let version = 1

  const send = (message: LspMessage): void => {
    window.api.sendToLanguageServer({ language, message })
  }

  const notify = (method: string, params: unknown): void => {
    send({ jsonrpc: '2.0', method, params })
  }

  const request = (method: string, params: unknown): Promise<unknown> => {
    const id = nextId++
    return new Promise((resolve) => {
      // A server that never answers must not leave the editor waiting forever.
      const giveUp = setTimeout(() => {
        pending.delete(id)
        resolve(null)
      }, 5_000)

      pending.set(id, (message) => {
        clearTimeout(giveUp)
        resolve(message.result ?? null)
      })

      send({ jsonrpc: '2.0', id, method, params })
    })
  }

  inboxes.set(language, (message) => {
    if (message.method === 'textDocument/publishDiagnostics') {
      const parsed = publishDiagnosticsSchema.safeParse(message.params)
      if (parsed.success && parsed.data.uri === documentUri) {
        for (const listener of diagnosticListeners) {
          listener(parsed.data.diagnostics)
        }
      }
      return
    }

    // Requests coming the other way. Answering anything is better than answering nothing:
    // a server left waiting on `workspace/configuration` simply stops working.
    if (message.method !== undefined && message.id !== undefined) {
      send({
        jsonrpc: '2.0',
        id: message.id,
        result: message.method === 'workspace/configuration' ? [{}] : null,
      })
      return
    }

    if (message.id !== undefined && message.method === undefined) {
      const resolver = pending.get(message.id)
      pending.delete(message.id)
      resolver?.(message)
    }
  })

  await request('initialize', {
    processId: null,
    rootUri,
    workspaceFolders: [{ uri: rootUri, name: 'quest' }],
    capabilities: {
      textDocument: {
        synchronization: { dynamicRegistration: false },
        publishDiagnostics: {},
        completion: { completionItem: { snippetSupport: true, documentationFormat: ['markdown'] } },
        hover: { contentFormat: ['markdown', 'plaintext'] },
        signatureHelp: { signatureInformation: { documentationFormat: ['markdown'] } },
        formatting: {},
      },
      workspace: { workspaceFolders: true, configuration: true },
    },
  })

  notify('initialized', {})
  setStatus(language, 'ready')

  const client: LspClient = {
    documentUri,
    documentLanguageId,

    update(text) {
      if (version === 1) {
        notify('textDocument/didOpen', {
          textDocument: { uri: documentUri, languageId: documentLanguageId, version, text },
        })
      } else {
        notify('textDocument/didChange', {
          textDocument: { uri: documentUri, version },
          contentChanges: [{ text }],
        })
      }
      version += 1
    },

    request,

    onDiagnostics(listener) {
      diagnosticListeners.push(listener)
    },
  }

  clients.set(language, client)
  return client
}
