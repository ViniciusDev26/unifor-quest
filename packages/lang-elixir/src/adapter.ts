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
import { decoderFor, elixirTypeFor, structDeclarations } from './type-mapping.js'

const SOLUTION_FILE = 'solution.ex'
const HARNESS_FILE = 'harness.exs'
const PRELUDE_FILE = 'graph.ex'
const WORKSPACE_PROJECT_FILE = 'mix.exs'

const BEGIN_PLACEHOLDER = '%%UQ_BEGIN%%'
const END_PLACEHOLDER = '%%UQ_END%%'
const INVOKE_BEGIN = '# uq:begin invoke'
const INVOKE_END = '# uq:end invoke'

/**
 * The functional, dynamically-typed member of the family (ADR 0056). JSON decodes to
 * native maps and lists the same way it does for Python, so the interesting parts are the
 * ones the BEAM makes different: no compile step, `struct/2` instead of a struct literal
 * for anything decoded at run time, and a process-dictionary counter for `ops` because
 * there is no mutable global to reach for.
 */
export const elixirAdapter: LanguageAdapter = {
  id: 'elixir',

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
      run: { kind: 'toolchain', toolchain: 'elixir', args: [HARNESS_FILE] },
    }
  },

  /**
   * ElixirLS. Unlike gopls, jdtls or Pyright it needs a Mix project to make sense of a
   * file, even a workspace as small as the editor's own (ADR 0050's precedent for Java).
   */
  languageServer({ challenge }): LanguageServer {
    return {
      command: { kind: 'toolchain', toolchain: 'elixir-ls', args: [] },
      workspaceFiles: [
        { path: WORKSPACE_PROJECT_FILE, contents: workspaceProject() },
        { path: SOLUTION_FILE, contents: stubFor(challenge) },
      ],
      documentPath: SOLUTION_FILE,
      documentLanguageId: 'elixir',
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

function workspaceProject(): string {
  return `defmodule Quest.MixProject do
  use Mix.Project

  def project do
    [app: :quest, version: "0.0.0", elixir: "~> 1.20"]
  end
end
`
}

function stubFor(challenge: Challenge): string {
  const structs = structDeclarations([
    ...challenge.parameters.map((parameter) => parameter.type),
    challenge.returns,
  ])

  const header = structs === '' ? '' : `${structs}\n\n`

  return `${header}defmodule Solution do
  @moduledoc false

  ${signature(challenge)}
  def ${challenge.functionName}(${parameterNames(challenge)}) do
    # Escreva sua solucao aqui.
    raise "nao implementado"
  end
end
`
}

function signature(challenge: Challenge): string {
  const parameters = challenge.parameters
    .map((parameter) => `${parameter.name} :: ${elixirTypeFor(parameter.type)}`)
    .join(', ')

  return `@spec ${challenge.functionName}(${parameters}) :: ${elixirTypeFor(challenge.returns)}`
}

function parameterNames(challenge: Challenge): string {
  return challenge.parameters.map((parameter) => parameter.name).join(', ')
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
    throw new Error('elixir harness template lost its uq:invoke markers')
  }

  return template.slice(0, from) + generated + template.slice(to + INVOKE_END.length)
}

/** The only Elixir this adapter writes by hand. */
function invoke(challenge: Challenge): string {
  const count = challenge.parameters.length

  const args = challenge.parameters
    .map((parameter, index) => decoderFor(parameter.type, `Enum.at(arguments, ${index})`))
    .join(', ')

  return `def invoke(arguments) do
    if length(arguments) != ${count} do
      raise argument_count_error(${count}, length(arguments))
    end

    Solution.${challenge.functionName}(${args})
  end
`
}
