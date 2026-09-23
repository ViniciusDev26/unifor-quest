import { z } from 'zod'

export const testResultSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  actual: z.json(),

  /** Tempo da execucao. E informacao, nao a metrica de complexidade (ADR 0011). */
  ms: z.number().int().nonnegative(),

  /** Operacoes contadas pelas estruturas instrumentadas do prelude (ADR 0011). */
  ops: z.number().int().nonnegative(),
})

export type TestResult = z.infer<typeof testResultSchema>

/**
 * O unico formato que o jogo interpreta, igual para toda linguagem (ADR 0006). O harness
 * emite este envelope entre marcadores com nonce, e ele chega ao jogo como texto vindo do
 * stdout de um processo externo: e dado nao confiavel, e passa por este schema antes de
 * virar tipo (ADR 0017).
 */
export const runEnvelopeSchema = z.object({
  results: z.array(testResultSchema),

  /** O que o codigo do jogador imprimiu, capturado a parte para nao corromper o envelope. */
  playerStdout: z.string(),

  /** Falha que impediu a execucao de chegar ao fim; `null` quando tudo rodou. */
  error: z.string().nullable(),
})

export type RunEnvelope = z.infer<typeof runEnvelopeSchema>
