import { z } from 'zod'
import { languageIdSchema } from './language.js'
import { typeSpecSchema } from './type-spec.js'

export const parameterSchema = z.object({
  name: z.string().min(1),
  type: typeSpecSchema,
})

export type Parameter = z.infer<typeof parameterSchema>

/**
 * Um caso de teste e dado puro (ADR 0004): `input` traz um valor JSON por parametro, na
 * ordem em que eles sao declarados, e `expected` e o retorno esperado.
 */
export const testCaseSchema = z.object({
  name: z.string().min(1),
  input: z.array(z.json()),
  expected: z.json(),
})

export type TestCase = z.infer<typeof testCaseSchema>

/**
 * O desafio de uma quest, descrito sem linguagem nenhuma. E daqui que cada adapter gera o
 * stub que o jogador ve e o harness que roda os testes (ADR 0005).
 */
export const challengeSchema = z.object({
  functionName: z.string().min(1),
  parameters: z.array(parameterSchema),
  returns: typeSpecSchema,
  cases: z.array(testCaseSchema).min(1),

  /** Valvula de escape (ADR 0007): testes escritos a mao, so para as linguagens suportadas. */
  customTests: z.boolean().default(false),

  /** Solucao de referencia por linguagem; precisa passar nos proprios testes (ADR 0014). */
  referenceSolutions: z.partialRecord(languageIdSchema, z.string().min(1)),
})

export type Challenge = z.infer<typeof challengeSchema>
