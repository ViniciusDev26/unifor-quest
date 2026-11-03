import { describe, expect, it } from 'vitest'
import type { RunEnvelope } from '../../src/contracts/run-envelope.js'
import type { JsonValue } from '../../src/json.js'
import { evaluateSubmission } from '../../src/rules/evaluate-submission.js'
import { helloWorld } from '../fixtures.js'

const challenge = helloWorld.challenge

function envelope(
  results: { name: string; actual: JsonValue; ops: number }[],
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
      envelope([{ name: 'Nome simples', actual: 'Ola, Vini!', ops: 0 }]),
    )

    expect(submission.solved).toBe(true)
    expect(submission.outcomes[0]?.passed).toBe(true)
  })

  it('fails the case when the returned value is not the expected one', () => {
    const submission = evaluateSubmission(
      challenge,
      // The harness has no opinion: it only reports what came back (ADR 0037).
      envelope([{ name: 'Nome simples', actual: 'Hello, Vini!', ops: 0 }]),
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
      envelope([{ name: 'Nome simples', actual: 'Ola, Vini!', ops: 0 }], 'timeout'),
    )

    expect(submission.solved).toBe(false)
    expect(submission.error).toBe('timeout')
  })

  it('adds up the operations reported by the instrumented structures', () => {
    const submission = evaluateSubmission(
      challenge,
      envelope([{ name: 'Nome simples', actual: 'Ola, Vini!', ops: 18 }]),
    )

    expect(submission.totalOps).toBe(18)
  })

  describe('with an opsBudget (ADR 0068)', () => {
    const duel = { ...challenge, opsBudget: 20 }
    const right = (ops: number) =>
      evaluateSubmission(duel, envelope([{ name: 'Nome simples', actual: 'Ola, Vini!', ops }]))

    it('solves when the right answers stay within the budget', () => {
      const submission = right(20)
      expect(submission).toMatchObject({ solved: true, correct: true, withinBudget: true })
    })

    it('does not solve right answers over the budget', () => {
      const submission = right(21)
      expect(submission).toMatchObject({ solved: false, correct: true, withinBudget: false })
    })

    it('still fails a wrong answer, however cheap', () => {
      const submission = evaluateSubmission(
        duel,
        envelope([{ name: 'Nome simples', actual: 'Hello', ops: 0 }]),
      )
      expect(submission).toMatchObject({ solved: false, correct: false, withinBudget: true })
    })
  })

  it('is always within budget when the challenge has none', () => {
    const submission = evaluateSubmission(
      challenge,
      envelope([{ name: 'Nome simples', actual: 'Ola, Vini!', ops: 1_000_000 }]),
    )
    expect(submission).toMatchObject({ solved: true, withinBudget: true })
  })
})
