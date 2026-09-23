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
import { goTypeFor, structDeclarations } from './type-mapping.js'

const SOLUTION_FILE = 'solution.go'
const HARNESS_FILE = 'harness.go'
const MODULE_FILE = 'go.mod'
const PRELUDE_FILE = 'graph.go'
const MODULE_CONTENTS = 'module quest\n\ngo 1.21\n'

/**
 * The binary is always named `.exe`, on every platform. Windows will not execute a file
 * without that extension, and on Linux and macOS the name is just a name.
 */
const BINARY = 'harness.exe'

const BEGIN_PLACEHOLDER = '%%UQ_BEGIN%%'
const END_PLACEHOLDER = '%%UQ_END%%'
const INVOKE_BEGIN = '// uq:begin invoke'
const INVOKE_END = '// uq:end invoke'

/**
 * Go is the first compiled language in the game, and the first to use both steps of the
 * executor: build, then run the artifact (ADR 0009). It builds with `CGO_ENABLED=0`, so no
 * C compiler is ever needed on the player's machine (ADR 0022).
 *
 * The harness is a real `.go` file under `templates/`, checked by the Go compiler and by
 * `go vet` on every build, and embedded into this package by `npm run generate`. Only the
 * region between the `uq:invoke` markers is generated per challenge (ADR 0005).
 */
export const goAdapter: LanguageAdapter = {
  id: 'go',

  scaffold(challenge: Challenge): Project {
    return { files: scaffoldFiles(challenge), entry: SOLUTION_FILE }
  },

  prepare({ challenge, playerFiles, nonce }): PreparedRun {
    return {
      files: [
        ...withPrelude(playerFiles),
        { path: HARNESS_FILE, contents: harness(challenge, nonce) },
      ],
      compile: { kind: 'toolchain', toolchain: 'go', args: ['build', '-o', BINARY, '.'] },
      run: { kind: 'artifact', path: BINARY, args: [] },
    }
  },

  /**
   * Monaco knows nothing about Go beyond syntax highlighting, so the editor gets a real
   * language server: `gopls` gives diagnostics, completion over the standard library,
   * hover documentation and `gofmt`.
   */
  languageServer({ challenge }): LanguageServer {
    return {
      command: { kind: 'toolchain', toolchain: 'gopls', args: [] },
      workspaceFiles: scaffoldFiles(challenge),
      documentPath: SOLUTION_FILE,
      documentLanguageId: 'go',
    }
  },
}

/** A Go module, because that is what a Go project is (ADR 0046). */
function scaffoldFiles(challenge: Challenge): GeneratedFile[] {
  return [
    { path: MODULE_FILE, contents: MODULE_CONTENTS },
    ...(usesGraph(challenge) ? [{ path: PRELUDE_FILE, contents: preludeSource }] : []),
    { path: SOLUTION_FILE, contents: stubFor(challenge) },
  ]
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
  return `package main\n\n${declarations(challenge)}${signature(challenge)} {\n\t// Escreva sua solucao aqui.\n\tpanic("nao implementado")\n}\n`
}

function signature(challenge: Challenge): string {
  const parameters = challenge.parameters
    .map((parameter) => `${parameter.name} ${goTypeFor(parameter.type)}`)
    .join(', ')

  return `func ${challenge.functionName}(${parameters}) ${goTypeFor(challenge.returns)}`
}

/** Named struct types the signature mentions, declared in the file the player edits. */
function declarations(challenge: Challenge): string {
  const declared = structDeclarations([
    ...challenge.parameters.map((parameter) => parameter.type),
    challenge.returns,
  ])
  return declared === '' ? '' : `${declared}\n\n`
}

/** Takes the template and swaps in the nonce and the call for this challenge. */
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
    throw new Error('go harness template lost its uq:invoke markers')
  }

  return template.slice(0, from) + generated + template.slice(to + INVOKE_END.length)
}

/** The only Go this adapter writes by hand: decode one argument per parameter, then call. */
function invoke(challenge: Challenge): string {
  const decode = challenge.parameters
    .map((parameter, index) =>
      parameter.type.kind === 'graph'
        ? `\targ${index}, err${index} := buildGraph(c.Input[${index}])\n` +
          `\tif err${index} != nil {\n\t\treturn nil, err${index}\n\t}\n`
        : `\tvar arg${index} ${goTypeFor(parameter.type)}\n` +
          `\tif err := json.Unmarshal(c.Input[${index}], &arg${index}); err != nil {\n` +
          '\t\treturn nil, err\n\t}\n',
    )
    .join('\n')

  const args = challenge.parameters.map((_parameter, index) => `arg${index}`).join(', ')
  const count = challenge.parameters.length

  return `func invoke(c harnessCase) (result any, failure error) {
\tdefer recoverInto(&failure)

\tif len(c.Input) != ${count} {
\t\treturn nil, argumentCountError(${count}, len(c.Input))
\t}

${decode}
\treturn ${challenge.functionName}(${args}), nil
}
`
}
