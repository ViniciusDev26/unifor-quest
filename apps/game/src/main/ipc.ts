import { challengeSchema, languageIdSchema, type RunEnvelope } from '@unifor-quest/core'
import { ipcMain } from 'electron'
import { z } from 'zod'
import { adapterFor } from './adapters'
import { createExecutor } from './executor'

export const RUN_CODE_CHANNEL = 'quest:run-code'
export const STUB_CHANNEL = 'quest:stub'

/**
 * Anything arriving over IPC is untrusted input and is validated before it becomes a type
 * (ADR 0017), even though the only sender today is our own renderer.
 */
const runCodeRequestSchema = z.object({
  challenge: challengeSchema,
  language: languageIdSchema,
  playerCode: z.string(),
})

const stubRequestSchema = z.object({
  challenge: challengeSchema,
  language: languageIdSchema,
})

export type RunCodeRequest = z.infer<typeof runCodeRequestSchema>

export function registerIpc(): void {
  const executor = createExecutor()

  // The stub belongs to the adapter, which knows how the language spells a signature
  // (ADR 0005). The renderer asks for it instead of guessing.
  ipcMain.handle(STUB_CHANNEL, (_event, payload: unknown): string => {
    const parsed = stubRequestSchema.safeParse(payload)
    return parsed.success
      ? (adapterFor(parsed.data.language)?.stub(parsed.data.challenge) ?? '')
      : ''
  })

  ipcMain.handle(RUN_CODE_CHANNEL, async (_event, payload: unknown): Promise<RunEnvelope> => {
    const parsed = runCodeRequestSchema.safeParse(payload)

    if (!parsed.success) {
      return { results: [], playerStdout: '', error: 'Pedido de execucao invalido.' }
    }

    return executor.run(parsed.data)
  })
}
