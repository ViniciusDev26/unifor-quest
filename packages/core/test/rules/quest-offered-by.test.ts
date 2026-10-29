import { describe, expect, it } from 'vitest'
import { questOfferedBy } from '../../src/rules/quest-offered-by.js'
import { helloWorld, questWith } from '../fixtures.js'

const empty = { completedQuests: [], flags: [] }

describe('questOfferedBy', () => {
  it('offers the available quest of that NPC', () => {
    expect(questOfferedBy([helloWorld], 'monitor', empty)).toBe(helloWorld)
  })

  it('offers nothing for an NPC with no quest', () => {
    expect(questOfferedBy([helloWorld], 'marcos', empty)).toBeUndefined()
  })

  it('ignores quests of other NPCs, even available ones', () => {
    const other = questWith({ id: 'other', npc: 'marcos' })
    expect(questOfferedBy([helloWorld, other], 'monitor', empty)).toBe(helloWorld)
  })

  it('offers nothing while the NPC quest is not available yet', () => {
    const locked = questWith({ id: 'locked', requires: { quests: ['missing'], flags: [] } })
    expect(questOfferedBy([locked], 'monitor', empty)).toBeUndefined()
  })

  it('offers the furthest along once the next one unlocks', () => {
    const second = questWith({ id: 'second', requires: { quests: ['hello-world'], flags: [] } })
    expect(questOfferedBy([helloWorld, second], 'monitor', empty)).toBe(helloWorld)
    expect(
      questOfferedBy([helloWorld, second], 'monitor', {
        completedQuests: ['hello-world'],
        flags: [],
      }),
    ).toBe(second)
  })

  it('keeps offering the last quest after everything is done, for replay', () => {
    const progress = { completedQuests: ['hello-world'], flags: [] }
    expect(questOfferedBy([helloWorld], 'monitor', progress)).toBe(helloWorld)
  })
})
