import {
  type Challenge,
  type LanguageId,
  type Project,
  parseSaveText,
  type RunEnvelope,
  type RunRequest,
  runEnvelopeSchema,
  type Save,
  type SaveParse,
} from '@unifor-quest/core'
import { z } from 'zod'

/**
 * Whatever comes back over IPC is untrusted until it has been through the schema
 * (ADR 0017), even though the sender is our own main process.
 */
const projectSchema = z.object({
  files: z.array(z.object({ path: z.string().min(1), contents: z.string() })).min(1),
  entry: z.string().min(1),
})

/** The starting project the player sees, from the adapter in the main process. */
export async function scaffoldFor(
  challenge: Challenge,
  language: LanguageId,
): Promise<Project | null> {
  const parsed = projectSchema.safeParse(await window.api.scaffoldFor({ challenge, language }))
  return parsed.success ? parsed.data : null
}

export async function runCode(request: RunRequest): Promise<RunEnvelope> {
  const raw = await window.api.runCode(request)
  const parsed = runEnvelopeSchema.safeParse(raw)

  if (!parsed.success) {
    return { results: [], playerStdout: '', error: 'O resultado da execucao veio corrompido.' }
  }

  return parsed.data
}

const saveWriteSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(['newer', 'failed']),
    detail: z.string().optional(),
    version: z.number().optional(),
  }),
])

export type SaveWrite = z.infer<typeof saveWriteSchema>

/** Writes the autosave (ADR 0020). A failure comes back as a value, so the game can say so. */
export async function writeSave(save: Save): Promise<SaveWrite> {
  try {
    const parsed = saveWriteSchema.safeParse(await window.api.save(save))
    return parsed.success
      ? parsed.data
      : { ok: false, reason: 'failed', detail: 'unexpected reply from the main process' }
  } catch (cause) {
    return { ok: false, reason: 'failed', detail: String(cause) }
  }
}

/** Reads the save back and validates it with `core`: nothing on disk is trusted (ADR 0072). */
export async function loadSave(): Promise<SaveParse> {
  try {
    const text = z
      .string()
      .nullable()
      .safeParse(await window.api.load())
    return text.success
      ? parseSaveText(text.data)
      : { kind: 'invalid', detail: 'unexpected reply from the main process' }
  } catch (cause) {
    return { kind: 'invalid', detail: String(cause) }
  }
}
