import { completeQuest, emptyProgress, type Progress, requirementsMet } from '@unifor-quest/core'
import { describe, expect, it } from 'vitest'
import { campusDoors } from '../../src/renderer/src/content/campus-doors.js'
import { storyQuests } from '../../src/renderer/src/content/story.js'

/**
 * The doors of the campus follow the story (ADR 0074). Played for real, quest by quest: a lock
 * that waits for a flag nobody sets, a typo included, would stay shut until the end.
 */
function progressAfter(questsDone: number): Progress {
  return storyQuests
    .slice(0, questsDone)
    .reduce((progress, quest) => completeQuest(progress, quest).progress, emptyProgress)
}

function lockedDoors(progress: Progress): string[] {
  return Object.entries(campusDoors)
    .filter(([, door]) => door.lock !== undefined && !requirementsMet(door.lock.requires, progress))
    .map(([buildingId]) => buildingId)
    .sort()
}

describe('campus doors', () => {
  it.each([
    { questsDone: 0, locked: ['bloco-de-tecnologia', 'centro-de-convivencia'] },
    { questsDone: 1, locked: ['bloco-de-tecnologia', 'centro-de-convivencia'] },
    { questsDone: 2, locked: ['bloco-de-tecnologia'] },
    { questsDone: 3, locked: [] },
    { questsDone: 4, locked: [] },
  ])('after $questsDone quests, only $locked stay locked', ({ questsDone, locked }) => {
    expect(lockedDoors(progressAfter(questsDone))).toEqual(locked)
  })

  it('all have something to say while locked', () => {
    const silentLocks = Object.values(campusDoors).filter((door) => door.lock?.lines.length === 0)
    expect(silentLocks).toEqual([])
  })
})
