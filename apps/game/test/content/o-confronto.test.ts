import { afterAll, describe, expect, it } from 'vitest'
import { oConfrontoQuest } from '../../src/renderer/src/content/bloco-de-tecnologia.js'
import { createTypeScriptRunner } from './run-typescript.js'

/**
 * The duel's budget is a number written by hand (ADR 0068), and this is what keeps it
 * honest: on the quest's own network, NULL's brute force must not fit in it — while the
 * reference Dijkstra does (`reference-solutions.test.ts`). Run for real, through the
 * TypeScript adapter, so the count is the prelude's, the same in every language (ADR 0054).
 */

/** NULL's brute force: every simple path from start, keeping the cheapest that ends right. */
const BRUTE_FORCE = `import type { Graph } from './graph.ts'

export function shortestDistance(network: Graph, start: string, end: string): number {
  let best = Infinity
  const visited = new Set<string>([start])
  const walk = (node: string, cost: number): void => {
    if (node === end) {
      best = Math.min(best, cost)
      return
    }
    for (const edge of network.neighbors(node)) {
      if (visited.has(edge.to)) continue
      visited.add(edge.to)
      walk(edge.to, cost + edge.weight)
      visited.delete(edge.to)
    }
  }
  walk(start, 0)
  return best === Infinity ? -1 : best
}
`

const runner = createTypeScriptRunner()

afterAll(() => runner.dispose())

describe('O confronto', () => {
  it('has a budget', () => {
    expect(oConfrontoQuest.challenge.opsBudget).toBeDefined()
  })

  it("does not let NULL's brute force win, even with every answer right", async () => {
    const submission = await runner.submit(oConfrontoQuest.challenge, BRUTE_FORCE)
    expect(submission.error).toBeNull()
    expect(submission).toMatchObject({ solved: false, correct: true, withinBudget: false })
  }, 60_000)
})
