import {
  type Challenge,
  envelopeMarkers,
  type LanguageAdapter,
  type PreparedRun,
  type Project,
} from '@unifor-quest/core'
import { harnessTemplate, jsonTemplate } from './templates.generated.js'
import { decoderFor, javaTypeFor, recordDeclarations } from './type-mapping.js'

const SOLUTION_FILE = 'Solution.java'
const HARNESS_FILE = 'Harness.java'
const JSON_FILE = 'Json.java'

const BEGIN_PLACEHOLDER = '%%UQ_BEGIN%%'
const END_PLACEHOLDER = '%%UQ_END%%'
const INVOKE_BEGIN = '// uq:begin invoke'
const INVOKE_END = '// uq:end invoke'

/**
 * Java runs straight from source (ADR 0023): `java Harness.java` compiles everything it
 * references in memory, so nothing is written to disk and the player's file keeps its own
 * line numbers in compiler errors.
 *
 * The harness and the JSON support are real `.java` files under `templates/`, checked by
 * the Java compiler on every build (ADR 0042). Only the call for the challenge at hand is
 * generated.
 */
export const javaAdapter: LanguageAdapter = {
  id: 'java',

  scaffold(challenge: Challenge): Project {
    return { files: [{ path: SOLUTION_FILE, contents: stubFor(challenge) }], entry: SOLUTION_FILE }
  },

  prepare({ challenge, playerFiles, nonce }): PreparedRun {
    return {
      files: [
        ...playerFiles,
        { path: JSON_FILE, contents: jsonTemplate },
        { path: HARNESS_FILE, contents: harness(challenge, nonce) },
      ],
      compile: null,
      run: { kind: 'toolchain', toolchain: 'java', args: [HARNESS_FILE] },
    }
  },
}

function stubFor(challenge: Challenge): string {
  const records = recordDeclarations([
    ...challenge.parameters.map((parameter) => parameter.type),
    challenge.returns,
  ])

  return `${records === '' ? '' : `${records}\n\n`}public class Solution {
    ${signature(challenge)} {
        // Escreva sua solucao aqui.
        throw new UnsupportedOperationException("nao implementado");
    }
}
`
}

function signature(challenge: Challenge): string {
  const parameters = challenge.parameters
    .map((parameter) => `${javaTypeFor(parameter.type)} ${parameter.name}`)
    .join(', ')

  return `public static ${javaTypeFor(challenge.returns)} ${challenge.functionName}(${parameters})`
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
    throw new Error('java harness template lost its uq:invoke markers')
  }

  return template.slice(0, from) + generated + template.slice(to + INVOKE_END.length)
}

/** The only Java this adapter writes by hand: decode one argument per parameter, then call. */
function invoke(challenge: Challenge): string {
  const count = challenge.parameters.length

  const decode = challenge.parameters
    .map(
      (parameter, index) =>
        `        ${javaTypeFor(parameter.type)} arg${index} = ${decoderFor(parameter.type, `input.get(${index})`)};`,
    )
    .join('\n')

  const args = challenge.parameters.map((_parameter, index) => `arg${index}`).join(', ')

  return `private static Object invoke(List<Object> input) {
        if (input.size() != ${count}) {
            throw argumentCountError(${count}, input.size());
        }

${decode}

        return Solution.${challenge.functionName}(${args});
    }

    `
}
