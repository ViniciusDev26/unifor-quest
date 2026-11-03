import { readFileSync } from 'node:fs'
import { validateQuest } from '@unifor-quest/core'
import { afterAll, describe, expect, it } from 'vitest'
import { storyQuests } from '../../src/renderer/src/content/story.js'
import { createTypeScriptRunner } from './run-typescript.js'

/**
 * Every quest has a reference solution that passes its own tests (ADR 0014) — run here,
 * for real. It is also the code `docs/solucoes.md` explains, so the document cannot show a
 * solution that does not work.
 */
const runner = createTypeScriptRunner()

const solutionsDoc = readFileSync(new URL('../../../../docs/solucoes.md', import.meta.url), 'utf8')

afterAll(() => runner.dispose())

describe('story quests', () => {
  for (const quest of storyQuests) {
    describe(quest.title, () => {
      it('is coherent content', () => {
        expect(validateQuest(quest)).toEqual([])
      })

      it('is solved by its TypeScript reference solution', async () => {
        const reference = quest.challenge.referenceSolutions.typescript
        expect(reference).toBeDefined()
        const submission = await runner.submit(quest.challenge, reference ?? '')
        expect(submission.error).toBeNull()
        expect(submission.outcomes.filter((outcome) => !outcome.passed)).toEqual([])
        expect(submission.solved).toBe(true)
      }, 60_000)

      it('is the solution docs/solucoes.md shows, word for word', () => {
        const reference = quest.challenge.referenceSolutions.typescript ?? ''
        expect(solutionsDoc).toContain(`\`\`\`typescript\n${reference}\`\`\``)
      })
    })
  }
})
