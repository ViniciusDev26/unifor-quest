import { describe, expect, it } from 'vitest'
import { applyEffect, completeQuest } from '../../src/rules/complete-quest.js'
import { emptyProgress } from '../../src/value-objects/progress.js'
import { questWith } from '../fixtures.js'

const quest = questWith({
  id: 'bfs-door',
  onSuccess: [{ kind: 'setFlag', flag: 'north-door-unlocked' }],
})

describe('completeQuest', () => {
  it('marks the quest, applies the effects and reports the first completion', () => {
    const completion = completeQuest(emptyProgress, quest)

    expect(completion.completedNow).toBe(true)
    expect(completion.progress.completedQuests).toEqual(['bfs-door'])
    expect(completion.progress.flags).toEqual(['north-door-unlocked'])
    expect(completion.effects).toEqual([{ kind: 'setFlag', flag: 'north-door-unlocked' }])
  })

  it('does not change the world on a replay', () => {
    const first = completeQuest(emptyProgress, quest)
    const second = completeQuest(first.progress, quest)

    expect(second.completedNow).toBe(false)
    expect(second.effects).toEqual([])
    expect(second.progress).toBe(first.progress)
  })

  it('does not mutate the progress it was given', () => {
    completeQuest(emptyProgress, quest)
    expect(emptyProgress).toEqual({ completedQuests: [], flags: [] })
  })
})

describe('applyEffect', () => {
  it('sets a flag', () => {
    expect(applyEffect(emptyProgress, { kind: 'setFlag', flag: 'met-the-monitor' }).flags).toEqual([
      'met-the-monitor',
    ])
  })

  it('does not duplicate a flag that is already set', () => {
    const progress = { completedQuests: [], flags: ['met-the-monitor'] }
    expect(applyEffect(progress, { kind: 'setFlag', flag: 'met-the-monitor' })).toBe(progress)
  })
})
