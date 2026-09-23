import type { JsonValue } from '../json.js'

/**
 * Compares what the player's code returned with what the test case declares.
 *
 * The rules are here, in `core`, and not in each adapter on purpose: if every language
 * decided for itself, TypeScript and Java would drift apart silently and the conformance
 * suite would have nothing to arbitrate with (ADR 0004, ADR 0019).
 *
 * - **Lists are ordered.** A route in the wrong order is a wrong route. A challenge whose
 *   answer is genuinely unordered has to say so; that mechanism does not exist yet.
 * - **Objects are compared by content**, never by key order: JSON objects have no
 *   meaningful order.
 * - **An extra field fails.** It is usually a bug, not generosity.
 * - **Numbers are compared exactly.** No floating-point tolerance yet: no challenge
 *   returns a real number so far. When one does, it is a new decision, not a silent
 *   default (ADR 0004).
 */
export function jsonEquals(expected: JsonValue, actual: JsonValue): boolean {
  if (expected === null || actual === null) {
    return expected === actual
  }

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      return false
    }
    if (expected.length !== actual.length) {
      return false
    }
    return expected.every((item, index) => {
      const other = actual[index]
      // Lengths match and JSON arrays hold no holes, so `other` is always present.
      return other !== undefined && jsonEquals(item, other)
    })
  }

  if (typeof expected === 'object' || typeof actual === 'object') {
    if (typeof expected !== 'object' || typeof actual !== 'object') {
      return false
    }
    const expectedKeys = Object.keys(expected)
    if (expectedKeys.length !== Object.keys(actual).length) {
      return false
    }
    return expectedKeys.every((key) => {
      const mine = expected[key]
      const other = actual[key]
      return mine !== undefined && other !== undefined && jsonEquals(mine, other)
    })
  }

  return expected === actual
}
