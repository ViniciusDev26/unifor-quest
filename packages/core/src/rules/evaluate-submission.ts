import type { RunEnvelope } from '../contracts/run-envelope.js'
import type { JsonValue } from '../json.js'
import type { Challenge } from '../value-objects/challenge.js'
import { jsonEquals } from './json-equals.js'

export type CaseOutcome = {
  name: string
  passed: boolean
  expected: JsonValue
  /** What the player's code returned, or `null` when the case never reported back. */
  actual: JsonValue
  /** True when the harness never reported this case — a crash or a timeout mid-run. */
  missing: boolean
  ops: number
}

export type Submission = {
  /** Every case passed and nothing blew up. This is what completes a quest. */
  solved: boolean
  outcomes: CaseOutcome[]
  /** What the harness reported as a run-level failure, if anything. */
  error: string | null
  totalOps: number
}

/**
 * Decides whether the player solved the challenge.
 *
 * The comparison happens **here**, not in the harness: the rules live in one place so that
 * TypeScript, Java and Go cannot drift apart (ADR 0032). The harness reports what the code
 * returned; the game says whether that is right.
 *
 * Cases are matched by name, and a case the harness never reported counts as failed — that
 * is what a crash or a timeout halfway through looks like, since every test runs in a
 * single execution (ADR 0006).
 */
export function evaluateSubmission(challenge: Challenge, envelope: RunEnvelope): Submission {
  const reported = new Map(envelope.results.map((result) => [result.name, result]))

  const outcomes = challenge.cases.map((testCase): CaseOutcome => {
    const result = reported.get(testCase.name)

    if (result === undefined) {
      return {
        name: testCase.name,
        passed: false,
        expected: testCase.expected,
        actual: null,
        missing: true,
        ops: 0,
      }
    }

    return {
      name: testCase.name,
      passed: jsonEquals(testCase.expected, result.actual),
      expected: testCase.expected,
      actual: result.actual,
      missing: false,
      ops: result.ops,
    }
  })

  return {
    solved: envelope.error === null && outcomes.every((outcome) => outcome.passed),
    outcomes,
    error: envelope.error,
    totalOps: outcomes.reduce((total, outcome) => total + outcome.ops, 0),
  }
}
