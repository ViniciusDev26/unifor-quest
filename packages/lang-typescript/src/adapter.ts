import {
  type Challenge,
  envelopeMarkers,
  type LanguageAdapter,
  type PreparedRun,
} from '@unifor-quest/core'
import { tsTypeFor } from './type-mapping.js'

const SOLUTION_FILE = 'solution.ts'
const HARNESS_FILE = 'harness.ts'

/**
 * TypeScript needs no compilation step of its own: Node strips the types and runs the file
 * (ADR 0021). Nothing is written to disk beyond the two source files, so nothing new gets
 * scanned on every run.
 */
export const typescriptAdapter: LanguageAdapter = {
  id: 'typescript',

  stub(challenge: Challenge): string {
    return `${signature(challenge)} {\n  // Escreva sua solucao aqui.\n  throw new Error('Nao implementado')\n}\n`
  },

  prepare({ challenge, playerCode, nonce }): PreparedRun {
    return {
      files: [
        { path: SOLUTION_FILE, contents: playerCode },
        { path: HARNESS_FILE, contents: harness(challenge, nonce) },
      ],
      compile: null,
      run: { kind: 'toolchain', toolchain: 'node', args: [HARNESS_FILE] },
    }
  },
}

function signature(challenge: Challenge): string {
  const parameters = challenge.parameters
    .map((parameter) => `${parameter.name}: ${tsTypeFor(parameter.type)}`)
    .join(', ')

  return `export function ${challenge.functionName}(${parameters}): ${tsTypeFor(challenge.returns)}`
}

/**
 * The harness reads the cases from stdin, runs them all in a single execution, redirects
 * whatever the player printed and emits the envelope between the nonce markers
 * (ADR 0006). It never decides whether a case passed — that is the game's job (ADR 0037).
 *
 * The player's code lives in its own file so that error line numbers match the editor.
 */
function harness(challenge: Challenge, nonce: string): string {
  const { begin, end } = envelopeMarkers(nonce)

  return `import { ${challenge.functionName} } from './${SOLUTION_FILE}'

type HarnessCase = { name: string; input: unknown[] }

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      raw += chunk
    })
    process.stdin.on('end', () => resolve(raw))
    process.stdin.on('error', reject)
  })
}

async function main(): Promise<void> {
  const cases: HarnessCase[] = JSON.parse(await readStdin())
  const results: { name: string; actual: unknown; ms: number; ops: number }[] = []

  const write = process.stdout.write.bind(process.stdout)
  let playerStdout = ''
  let error: string | null = null

  process.stdout.write = ((chunk: string | Uint8Array) => {
    playerStdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString()
    return true
  }) as typeof process.stdout.write

  try {
    for (const testCase of cases) {
      const startedAt = performance.now()
      let actual: unknown = null
      try {
        const solve = ${challenge.functionName} as unknown as (...args: unknown[]) => unknown
        actual = solve(...testCase.input)
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause)
      }
      results.push({
        name: testCase.name,
        actual: actual === undefined ? null : actual,
        ms: Math.round(performance.now() - startedAt),
        ops: 0
      })
      if (error !== null) {
        break
      }
    }
  } finally {
    process.stdout.write = write
  }

  write(${JSON.stringify(begin)} + JSON.stringify({ results, playerStdout, error }) + ${JSON.stringify(end)})
}

main().catch((cause) => {
  const message = cause instanceof Error ? cause.message : String(cause)
  process.stdout.write(
    ${JSON.stringify(begin)} +
      JSON.stringify({ results: [], playerStdout: '', error: message }) +
      ${JSON.stringify(end)}
  )
})
`
}
