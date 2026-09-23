import { z } from 'zod'

/**
 * The single place where `process.env` is read in the main process.
 * Every environment variable goes through here and is validated at startup: if one is
 * missing or malformed, the process fails immediately with an explicit cause instead of
 * breaking later with `undefined` (ADR 0017).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),

  /** Injected by electron-vite in development only; absent from production builds. */
  ELECTRON_RENDERER_URL: z.url().optional(),

  /** Needed so a language server can find the toolchain it shells out to (ADR 0043). */
  PATH: z.string().optional(),

  /** Cache roots used to place the work directory on Windows and Linux (ADR 0026). */
  LOCALAPPDATA: z.string().min(1).optional(),
  XDG_CACHE_HOME: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`)
  }

  return parsed.data
}

export const env: Env = loadEnv()
