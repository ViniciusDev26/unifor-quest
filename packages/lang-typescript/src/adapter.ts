import {
  type Challenge,
  envelopeMarkers,
  type GeneratedFile,
  type LanguageAdapter,
  type PreparedRun,
  type Project,
  type TypeSpec,
} from '@unifor-quest/core'
import { PRELUDE_FILE, preludeSource } from './prelude.js'
import { tsTypeFor } from './type-mapping.js'

const SOLUTION_FILE = 'solution.ts'
const HARNESS_FILE = 'harness.ts'

/**
 * TypeScript needs no compilation step of its own: Node strips the types and runs the file
 * (ADR 0021). Nothing is written to disk beyond the source files, so nothing new gets
 * scanned on every run.
 */
export const typescriptAdapter: LanguageAdapter = {
  id: 'typescript',

  scaffold(challenge: Challenge): Project {
    const imports = usesGraph(challenge) ? `import type { Graph } from './${PRELUDE_FILE}'\n\n` : ''

    return {
      files: [
        ...(usesGraph(challenge) ? [{ path: PRELUDE_FILE, contents: preludeSource }] : []),
        {
          path: SOLUTION_FILE,
          contents: `${imports}${signature(challenge)} {\n  // Escreva sua solucao aqui.\n  throw new Error('Nao implementado')\n}\n`,
        },
      ],
      entry: SOLUTION_FILE,
    }
  },

  prepare({ challenge, playerFiles, nonce }): PreparedRun {
    return {
      files: [
        ...withPrelude([...playerFiles]),
        { path: HARNESS_FILE, contents: harness(challenge, nonce) },
      ],
      compile: null,
      run: { kind: 'toolchain', toolchain: 'node', args: [HARNESS_FILE] },
    }
  },
}

/**
 * The prelude always travels with a run, so the harness can count operations without
 * knowing whether this challenge speaks of graphs (ADR 0011). The player only sees it in
 * the scaffold when it is relevant.
 */
function withPrelude(files: GeneratedFile[]): GeneratedFile[] {
  if (files.some((file) => file.path === PRELUDE_FILE)) {
    return files
  }
  return [{ path: PRELUDE_FILE, contents: preludeSource }, ...files]
}

export function usesGraph(challenge: Challenge): boolean {
  const mentions = (spec: TypeSpec): boolean => {
    switch (spec.kind) {
      case 'graph':
        return true
      case 'list':
        return mentions(spec.element)
      case 'map':
        return mentions(spec.value)
      case 'nullable':
        return mentions(spec.inner)
      case 'struct':
        return spec.fields.some((field) => mentions(field.type))
      default:
        return false
    }
  }

  return [...challenge.parameters.map((p) => p.type), challenge.returns].some(mentions)
}

function signature(challenge: Challenge): string {
  const parameters = challenge.parameters
    .map((parameter) => `${parameter.name}: ${tsTypeFor(parameter.type)}`)
    .join(', ')

  return `export function ${challenge.functionName}(${parameters}): ${tsTypeFor(challenge.returns)}`
}

/**
 * The harness reads the cases from stdin, runs them all in a single execution, redirects
 * whatever the player printed and emits the envelope between the nonce markers (ADR 0006).
 * It never decides whether a case passed — that is the game's job (ADR 0037).
 *
 * The player's code lives in its own file so that error line numbers match the editor.
 */
function harness(challenge: Challenge, nonce: string): string {
  const { begin, end } = envelopeMarkers(nonce)
  const graph = usesGraph(challenge)

  const preludeImport = graph
    ? `import { buildGraph, opsCount, resetOps } from './${PRELUDE_FILE}'\n`
    : ''

  const args = challenge.parameters
    .map((parameter, index) =>
      parameter.type.kind === 'graph' ? `buildGraph(input[${index}])` : `input[${index}]`,
    )
    .join(', ')

  return `import { ${challenge.functionName} } from './${SOLUTION_FILE}'
${preludeImport}
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
      const input = testCase.input
      ${graph ? 'resetOps()' : ''}
      const startedAt = performance.now()
      let actual: unknown = null
      try {
        actual = ${challenge.functionName}(${args})
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause)
      }
      results.push({
        name: testCase.name,
        actual: actual === undefined ? null : actual,
        ms: Math.round(performance.now() - startedAt),
        ops: ${graph ? 'opsCount()' : '0'}
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
