import type { TestCase } from '../value-objects/test-case.js'
import { type RunEnvelope, runEnvelopeSchema } from './run-envelope.js'

/**
 * The harness prints its envelope between markers carrying a nonce, so that a player who
 * prints something envelope-shaped cannot forge a result (ADR 0006).
 */
export function envelopeMarkers(nonce: string): { begin: string; end: string } {
  return { begin: `<<<UNIFOR-QUEST-BEGIN:${nonce}>>>`, end: `<<<UNIFOR-QUEST-END:${nonce}>>>` }
}

/**
 * What the harness reads on stdin. `expected` is deliberately absent: the harness does not
 * compare anything, it only reports what the code returned (ADR 0037).
 */
export type HarnessCase = { name: string; input: TestCase['input'] }

export function harnessInput(cases: readonly TestCase[]): string {
  return JSON.stringify(cases.map(({ name, input }): HarnessCase => ({ name, input })))
}

export type EnvelopeParse =
  | { ok: true; envelope: RunEnvelope }
  | { ok: false; reason: 'missing' | 'malformed'; detail: string }

/** Pulls the envelope out of whatever the process printed, and validates it (ADR 0017). */
export function parseEnvelope(stdout: string, nonce: string): EnvelopeParse {
  const { begin, end } = envelopeMarkers(nonce)
  const from = stdout.indexOf(begin)
  const to = stdout.indexOf(end, from + begin.length)

  if (from === -1 || to === -1) {
    return { ok: false, reason: 'missing', detail: 'no envelope between the markers' }
  }

  const raw = stdout.slice(from + begin.length, to)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return { ok: false, reason: 'malformed', detail: String(cause) }
  }

  const validated = runEnvelopeSchema.safeParse(parsed)
  if (!validated.success) {
    return {
      ok: false,
      reason: 'malformed',
      detail: validated.error.issues[0]?.message ?? 'invalid',
    }
  }

  return { ok: true, envelope: validated.data }
}
