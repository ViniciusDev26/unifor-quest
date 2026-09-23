import type { Quest } from '../entities/quest.js'
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

    if (testCase.input.length !== challenge.parameters.length) {
      issues.push(
        `${where}: expected ${challenge.parameters.length} argument(s), got ${testCase.input.length}`,
      )
      continue
    }

    for (const [position, parameter] of challenge.parameters.entries()) {
      const argument = testCase.input[position]
      if (argument === undefined) {
        issues.push(`${where}: missing argument for ${parameter.name}`)
        continue
      }
      issues.push(...validateValue(parameter.type, argument, `${where}.${parameter.name}`))
    }

    issues.push(...validateValue(challenge.returns, testCase.expected, `${where}.expected`))
  }

  if (languagesFor(challenge).length === 0) {
    issues.push(`${quest.id}: customTests is set but no language has a reference solution`)
  }

  return issues
}
