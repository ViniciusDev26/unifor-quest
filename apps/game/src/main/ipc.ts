import {
  challengeSchema,
  languageIdSchema,
  type Project,
  type RunEnvelope,
  saveSchema,
} from '@unifor-quest/core'
import { app, ipcMain } from 'electron'
import { z } from 'zod'
import { adapterFor } from './adapters'
import { createExecutor } from './executor'
import {
  type LanguageServerHandle,
  LSP_SEND_CHANNEL,
  LSP_START_CHANNEL,
  LSP_STOP_CHANNEL,
  sendTo,
  startFor,
  stopAll,
} from './language-servers'
import { createSaveStore, type SaveWrite } from './save-store'

export const RUN_CODE_CHANNEL = 'quest:run-code'
export const SCAFFOLD_CHANNEL = 'quest:scaffold'
export const SAVE_WRITE_CHANNEL = 'save:write'
export const SAVE_LOAD_CHANNEL = 'save:load'

/**
 * Anything arriving over IPC is untrusted input and is validated before it becomes a type
 * (ADR 0017), even though the only sender today is our own renderer.
 */
const generatedFileSchema = z.object({
  path: z.string().min(1),
  contents: z.string(),
})

const runCodeRequestSchema = z.object({
  challenge: challengeSchema,
  language: languageIdSchema,
  playerFiles: z.array(generatedFileSchema).min(1),
})

const stubRequestSchema = z.object({
  challenge: challengeSchema,
  language: languageIdSchema,
})

const lspSendSchema = z.object({
  language: languageIdSchema,
  message: z.unknown(),
})

export type RunCodeRequest = z.infer<typeof runCodeRequestSchema>

export function registerIpc(): void {
  const executor = createExecutor()
  const saves = createSaveStore(app.getPath('userData'))

  // The starting project belongs to the adapter, which knows what a project looks like in
  // that language (ADR 0005, ADR 0047). The renderer asks for it instead of guessing.
  ipcMain.handle(SCAFFOLD_CHANNEL, (_event, payload: unknown): Project | null => {
    const parsed = stubRequestSchema.safeParse(payload)
    return parsed.success
      ? (adapterFor(parsed.data.language)?.scaffold(parsed.data.challenge) ?? null)
      : null
  })

  // The editor's language server: started on demand, one per language (ADR 0044).
  ipcMain.handle(LSP_START_CHANNEL, (event, payload: unknown): LanguageServerHandle | null => {
    const parsed = stubRequestSchema.safeParse(payload)
    return parsed.success
      ? startFor(parsed.data.language, parsed.data.challenge, event.sender)
      : null
  })

  ipcMain.on(LSP_SEND_CHANNEL, (_event, payload: unknown) => {
    const parsed = lspSendSchema.safeParse(payload)
    if (parsed.success) {
      sendTo(parsed.data.language, parsed.data.message)
    }
  })

  ipcMain.on(LSP_STOP_CHANNEL, () => {
    stopAll()
  })

  ipcMain.handle(RUN_CODE_CHANNEL, async (_event, payload: unknown): Promise<RunEnvelope> => {
    const parsed = runCodeRequestSchema.safeParse(payload)

    if (!parsed.success) {
      return { results: [], playerStdout: '', error: 'Pedido de execucao invalido.' }
    }

    return executor.run(parsed.data)
  })

  // The autosave, after every completed quest (ADR 0020). The renderer built it, but over
  // IPC it is untrusted all the same, and a malformed save is never written over a good one.
  ipcMain.handle(SAVE_WRITE_CHANNEL, (_event, payload: unknown): Promise<SaveWrite> | SaveWrite => {
    const parsed = saveSchema.safeParse(payload)
    return parsed.success
      ? saves.write(parsed.data)
      : { ok: false, reason: 'failed', detail: 'invalid save' }
  })

  // The save's raw text: whoever loads it validates it with `core` (ADR 0072).
  ipcMain.handle(SAVE_LOAD_CHANNEL, (): Promise<string | null> => saves.read())
}
