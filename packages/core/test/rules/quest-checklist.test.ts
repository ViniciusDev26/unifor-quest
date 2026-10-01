import { describe, expect, it } from 'vitest'
import { questChecklist } from '../../src/rules/quest-checklist.js'
import { helloWorld, questWith } from '../fixtures.js'

describe('questChecklist', () => {
  it('shows an available quest as not completed', () => {
    expect(questChecklist([helloWorld], { completedQuests: [], flags: [] })).toEqual([
      { quest: helloWorld, completed: false },
    ])
  })

  it('leaves out a quest that is not available yet', () => {
    const second = questWith({ id: 'second', requires: { quests: ['hello-world'], flags: [] } })
    expect(questChecklist([helloWorld, second], { completedQuests: [], flags: [] })).toEqual([
      { quest: helloWorld, completed: false },
    ])
  })

  it('marks a completed quest and still shows the one it unlocked', () => {
    const second = questWith({ id: 'second', requires: { quests: ['hello-world'], flags: [] } })
    const progress = { completedQuests: ['hello-world'], flags: [] }
    expect(questChecklist([helloWorld, second], progress)).toEqual([
      { quest: helloWorld, completed: true },
      { quest: second, completed: false },
    ])
  })

  it('preserves the order the quests were given in', () => {
    const second = questWith({ id: 'second' })
    const progress = { completedQuests: [], flags: [] }
    expect(questChecklist([second, helloWorld], progress).map((entry) => entry.quest.id)).toEqual([
      'second',
      'hello-world',
    ])
  })
})
