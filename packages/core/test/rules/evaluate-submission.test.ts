import { describe, expect, it } from 'vitest'
import type { RunEnvelope } from '../../src/contracts/run-envelope.js'
import type { JsonValue } from '../../src/json.js'
import { evaluateSubmission } from '../../src/rules/evaluate-submission.js'
import { helloWorld } from '../fixtures.js'

const challenge = helloWorld.challenge

function envelope(
  results: { name: string; passed: boolean; actual: JsonValue; ops: number }[],
  error: string | null = null,
): RunEnvelope {
  return {
    results: results.map((result) => ({ ...result, ms: 1 })),
    playerStdout: '',
    error,
  }
}

describe('evaluateSubmission', () => {
  it('solves the challenge when every case matches', () => {
    const submission = evaluateSubmission(
      challenge,
      envelope([{ name: 'Nome simples', passed: true, actual: 'Ola, Vini!', ops: 0 }]),
    )

    expect(submission.solved).toBe(true)
    expect(submission.outcomes[0]?.passed).toBe(true)
  })

  it('ignores what the harness claims and compares the values itself', () => {
    const submission = evaluateSubmission(
      challenge,
      // The harness says it passed; the returned value says otherwise.
      envelope([{ name: 'Nome simples', passed: true, actual: 'Hello, Vini!', ops: 0 }]),
    )

    expect(submission.solved).toBe(false)
    expect(submission.outcomes[0]?.passed).toBe(false)
    expect(submission.outcomes[0]?.actual).toBe('Hello, Vini!')
  })

  it('counts a case the harness never reported as failed', () => {
    const submission = evaluateSubmission(challenge, envelope([]))

    expect(submission.solved).toBe(false)
    expect(submission.outcomes[0]?.missing).toBe(true)
  })

  it('never solves when the run itself failed', () => {
    const submission = evaluateSubmission(
      challenge,
      envelope([{ name: 'Nome simples', passed: true, actual: 'Ola, Vini!', ops: 0 }], 'timeout'),
    )

    expect(submission.solved).toBe(false)
    expect(submission.error).toBe('timeout')
  })

  it('adds up the operations reported by the instrumented structures', () => {
    const submission = evaluateSubmission(
      challenge,
      envelope([{ name: 'Nome simples', passed: true, actual: 'Ola, Vini!', ops: 18 }]),
    )

    expect(submission.totalOps).toBe(18)
  })
})
