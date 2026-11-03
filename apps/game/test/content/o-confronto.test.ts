import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluateSubmission, validateQuest } from '@unifor-quest/core'
import { typescriptAdapter } from '@unifor-quest/lang-typescript'
import { createLocalExecutor } from '@unifor-quest/runner'
import { afterAll, describe, expect, it } from 'vitest'
import { oConfrontoQuest } from '../../src/renderer/src/content/bloco-de-tecnologia.js'

/**
 * The duel's budget is a number written by hand (ADR 0068), and this is what keeps it
 * honest: on the quest's own network, a Dijkstra has to fit in it and NULL's brute force
 * must not. Run for real, through the TypeScript adapter, so the count is the prelude's —
 * the same in every language (ADR 0054).
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

const workDir = mkdtempSync(join(tmpdir(), 'unifor-quest-content-'))

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const executor = createLocalExecutor({
  workDir,
  adapters: [typescriptAdapter],
  resolveToolchain: () => ({ executable: process.execPath }),
})

const { challenge } = oConfrontoQuest

async function submit(solution: string) {
  const scaffold = typescriptAdapter.scaffold(challenge)
  const playerFiles = scaffold.files.map((file) =>
    file.path === 'solution.ts' ? { ...file, contents: solution } : file,
  )
  const envelope = await executor.run({ challenge, language: 'typescript', playerFiles })
  return evaluateSubmission(challenge, envelope)
}

describe('O confronto', () => {
  it('is coherent content', () => {
    expect(validateQuest(oConfrontoQuest)).toEqual([])
  })

  it('has a budget', () => {
    expect(challenge.opsBudget).toBeDefined()
  })

  it('lets a Dijkstra beat NULL', async () => {
    const reference = challenge.referenceSolutions.typescript
    expect(reference).toBeDefined()
    const submission = await submit(reference ?? '')
    expect(submission.error).toBeNull()
    expect(submission).toMatchObject({ solved: true, withinBudget: true })
  }, 60_000)

  it("does not let NULL's brute force win, even with every answer right", async () => {
    const submission = await submit(BRUTE_FORCE)
    expect(submission.error).toBeNull()
    expect(submission).toMatchObject({ solved: false, correct: true, withinBudget: false })
  }, 60_000)
})
