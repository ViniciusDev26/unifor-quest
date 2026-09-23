import { z } from 'zod'

/**
 * Unico ponto onde `process.env` e lido no main process.
 * Toda variavel de ambiente passa por aqui e e validada na inicializacao:
 * se faltar ou vier malformada, o processo falha na hora, com a causa explicita,
 * em vez de quebrar mais tarde com `undefined` (ADR 0017).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),

  /** Injetada pelo electron-vite so em desenvolvimento; ausente no build de producao. */
  ELECTRON_RENDERER_URL: z.url().optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    throw new Error(`Variaveis de ambiente invalidas:\n${z.prettifyError(parsed.error)}`)
  }

  return parsed.data
}

export const env: Env = loadEnv()
