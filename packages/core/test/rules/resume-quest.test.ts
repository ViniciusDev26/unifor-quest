import { describe, expect, it } from 'vitest'
import { resumeQuest } from '../../src/rules/resume-quest.js'
import type { Progress } from '../../src/value-objects/progress.js'
import { helloWorld, questWith } from '../fixtures.js'

const second = questWith({ id: 'second', requires: { quests: ['hello-world'], flags: [] } })
const third = questWith({ id: 'third', requires: { quests: ['second'], flags: [] } })
const story = [helloWorld, second, third]

const progressWith = (completedQuests: string[]): Progress => ({
  completedQuests,
  flags: [],
  seenCutscenes: [],
})

describe('resumeQuest', () => {
  it('starts at the first quest when nothing is done', () => {
    expect(resumeQuest(story, progressWith([]))).toBe(helloWorld)
  })

  it('picks up at the next quest in story order', () => {
    expect(resumeQuest(story, progressWith(['hello-world']))).toBe(second)
    expect(resumeQuest(story, progressWith(['hello-world', 'second']))).toBe(third)
  })

  it('skips a completed quest even though it stays available for replay', () => {
    expect(resumeQuest([helloWorld, second], progressWith(['hello-world']))).toBe(second)
  })

  it('resumes at the last quest once the story is over', () => {
    expect(resumeQuest(story, progressWith(['hello-world', 'second', 'third']))).toBe(third)
  })

  it('has nowhere to resume when nothing was done or is available', () => {
    const locked = questWith({ id: 'locked', requires: { quests: ['never'], flags: [] } })
    expect(resumeQuest([locked], progressWith([]))).toBeUndefined()
  })
})
