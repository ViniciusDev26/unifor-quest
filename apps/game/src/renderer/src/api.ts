import type { Challenge, LanguageId, Project, RunRequest } from '@unifor-quest/core'
import { z } from 'zod'

const projectSchema = z.object({
  files: z.array(z.object({ path: z.string().min(1), contents: z.string() })).min(1),
  entry: z.string().min(1),
})

import { type RunEnvelope, runEnvelopeSchema } from '@unifor-quest/core'

/**
 * Whatever comes back over IPC is untrusted until it has been through the schema
 * (ADR 0017), even though the sender is our own main process.
 */
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
