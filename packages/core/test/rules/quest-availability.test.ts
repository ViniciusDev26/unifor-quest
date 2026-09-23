import { describe, expect, it } from 'vitest'
import {
  availableQuests,
  isQuestAvailable,
  isQuestCompleted,
} from '../../src/rules/quest-availability.js'
import { helloWorld, questWith } from '../fixtures.js'

describe('isQuestAvailable', () => {
  it('shows a quest with no prerequisites', () => {
    expect(isQuestAvailable(helloWorld, { completedQuests: [], flags: [] })).toBe(true)
  })

  it('hides a quest whose required quest is not done', () => {
    const second = questWith({ id: 'second', requires: { quests: ['hello-world'], flags: [] } })
    expect(isQuestAvailable(second, { completedQuests: [], flags: [] })).toBe(false)
    expect(isQuestAvailable(second, { completedQuests: ['hello-world'], flags: [] })).toBe(true)
  })

  it('hides a quest whose required flag is not set', () => {
    const gated = questWith({
      id: 'gated',
      requires: { quests: [], flags: ['north-door-unlocked'] },
    })
    expect(isQuestAvailable(gated, { completedQuests: [], flags: [] })).toBe(false)
    expect(isQuestAvailable(gated, { completedQuests: [], flags: ['north-door-unlocked'] })).toBe(
      true,
    )
  })

  it('keeps a completed quest available, so it can be replayed in another language', () => {
    const progress = { completedQuests: ['hello-world'], flags: [] }
    expect(isQuestAvailable(helloWorld, progress)).toBe(true)
    expect(isQuestCompleted(helloWorld, progress)).toBe(true)
  })

  it('filters a list of quests', () => {
    const second = questWith({ id: 'second', requires: { quests: ['hello-world'], flags: [] } })
    expect(availableQuests([helloWorld, second], { completedQuests: [], flags: [] })).toEqual([
      helloWorld,
    ])
  })
})
