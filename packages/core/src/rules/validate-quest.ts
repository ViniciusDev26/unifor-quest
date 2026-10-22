import type { Quest } from '../entities/quest.js'
import type { Challenge } from '../value-objects/challenge.js'
import type { Example } from '../value-objects/test-case.js'
import { languagesFor } from './languages-for.js'
import { validateValue } from './validate-value.js'

/**
 * Checks that a quest is coherent with itself, and returns the problems found.
 *
 * The schema already guarantees the shape; this checks the things a schema cannot see —
 * mostly that the test cases actually match the signature the challenge declares. It is
 * what catches broken content while someone is writing it, instead of in the player's face
 * (ADR 0032).
 */
export function validateQuest(quest: Quest): string[] {
  const issues: string[] = []
  const { challenge } = quest
  const seen = new Set<string>()

  for (const [index, testCase] of challenge.cases.entries()) {
    const where = `${quest.id}.cases[${index}] (${testCase.name})`

    // Outcomes are matched back to cases by name (see evaluateSubmission), so two cases
    // sharing one name would silently collapse into a single result.
    if (seen.has(testCase.name)) {
      issues.push(`${where}: duplicate case name`)
    }
    seen.add(testCase.name)

    issues.push(...validateCall(challenge, testCase, where))
  }

  // An example that does not fit the signature would teach the player the wrong contract.
  for (const [index, example] of challenge.examples.entries()) {
    issues.push(...validateCall(challenge, example, `${quest.id}.examples[${index}]`))
  }

  if (languagesFor(challenge).length === 0) {
    issues.push(`${quest.id}: customTests is set but no language has a reference solution`)
  }

  return issues
}

/** Checks one input/expected pair — a test case or an example — against the signature. */
function validateCall(challenge: Challenge, call: Example, where: string): string[] {
  if (call.input.length !== challenge.parameters.length) {
    return [
      `${where}: expected ${challenge.parameters.length} argument(s), got ${call.input.length}`,
    ]
  }

  const issues: string[] = []
  for (const [position, parameter] of challenge.parameters.entries()) {
    const argument = call.input[position]
    if (argument === undefined) {
      issues.push(`${where}: missing argument for ${parameter.name}`)
      continue
    }
    issues.push(...validateValue(parameter.type, argument, `${where}.${parameter.name}`))
  }

  issues.push(...validateValue(challenge.returns, call.expected, `${where}.expected`))
  return issues
}
