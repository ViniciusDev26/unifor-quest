import {
  type Challenge,
  envelopeMarkers,
  type GeneratedFile,
  type LanguageAdapter,
  type LanguageServer,
  type PreparedRun,
  type Project,
  type TypeSpec,
} from '@unifor-quest/core'
import { harnessTemplate, preludeSource } from './templates.generated.js'
import { dataclassDeclarations, decoderFor, pythonTypeFor } from './type-mapping.js'

const SOLUTION_FILE = 'solution.py'
const HARNESS_FILE = 'harness.py'
const PRELUDE_FILE = 'graph.py'

const BEGIN_PLACEHOLDER = '%%UQ_BEGIN%%'
const END_PLACEHOLDER = '%%UQ_END%%'
const INVOKE_BEGIN = '# uq:begin invoke'
const INVOKE_END = '# uq:end invoke'

/**
 * The cheapest adapter of the four, and that is the interesting part: JSON is in the
 * standard library, there is no compilation step, and the parsed values already have the
 * shape the function expects. What is left is the stub and the call.
 */
export const pythonAdapter: LanguageAdapter = {
  id: 'python',

  scaffold(challenge: Challenge): Project {
    return {
      files: [
        ...(usesGraph(challenge) ? [{ path: PRELUDE_FILE, contents: preludeSource }] : []),
        { path: SOLUTION_FILE, contents: stubFor(challenge) },
      ],
      entry: SOLUTION_FILE,
    }
  },

  prepare({ challenge, playerFiles, nonce }): PreparedRun {
    return {
      files: [
        ...withPrelude(playerFiles),
        { path: HARNESS_FILE, contents: harness(challenge, nonce) },
      ],
      compile: null,
      run: { kind: 'toolchain', toolchain: 'python', args: [HARNESS_FILE] },
    }
  },

  /**
   * Pyright, which runs on Node — the one the game already carries. Python gets a full
   * language service without a second runtime, the same way TypeScript does (ADR 0053).
   */
  languageServer({ challenge }): LanguageServer {
    return {
      command: { kind: 'toolchain', toolchain: 'pyright', args: [] },
      workspaceFiles: [{ path: SOLUTION_FILE, contents: stubFor(challenge) }],
      documentPath: SOLUTION_FILE,
      documentLanguageId: 'python',
    }
  },
}

/**
 * The prelude always travels with a run, so the harness can count operations without
 * knowing whether this challenge speaks of graphs (ADR 0011). The player only sees it in
 * the scaffold when it is relevant.
 */
function withPrelude(files: readonly GeneratedFile[]): GeneratedFile[] {
  if (files.some((file) => file.path === PRELUDE_FILE)) {
    return [...files]
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

function stubFor(challenge: Challenge): string {
  const dataclasses = dataclassDeclarations([
    ...challenge.parameters.map((parameter) => parameter.type),
    challenge.returns,
  ])

  const header =
    dataclasses === '' ? '' : `from dataclasses import dataclass\n\n\n${dataclasses}\n\n\n`

  return `${header}${signature(challenge)}:
    # Escreva sua solucao aqui.
    raise NotImplementedError("nao implementado")
`
}

function signature(challenge: Challenge): string {
  const parameters = challenge.parameters
    .map((parameter) => `${parameter.name}: ${pythonTypeFor(parameter.type)}`)
    .join(', ')

  return `def ${challenge.functionName}(${parameters}) -> ${pythonTypeFor(challenge.returns)}`
}

function harness(challenge: Challenge, nonce: string): string {
  const { begin, end } = envelopeMarkers(nonce)

  return replaceRegion(
    harnessTemplate.replace(BEGIN_PLACEHOLDER, begin).replace(END_PLACEHOLDER, end),
    invoke(challenge),
  )
}

function replaceRegion(template: string, generated: string): string {
  const from = template.indexOf(INVOKE_BEGIN)
  const to = template.indexOf(INVOKE_END)

  if (from === -1 || to === -1) {
    throw new Error('python harness template lost its uq:invoke markers')
  }

  return template.slice(0, from) + generated + template.slice(to + INVOKE_END.length)
}

/** The only Python this adapter writes by hand. */
function invoke(challenge: Challenge): string {
  const count = challenge.parameters.length

  const args = challenge.parameters
    .map((parameter, index) => decoderFor(parameter.type, `arguments[${index}]`))
    .join(', ')

  return `def invoke(arguments: list) -> object:
    if len(arguments) != ${count}:
        raise argument_count_error(${count}, len(arguments))

    return solution.${challenge.functionName}(${args})
`
}
