import { emptyProgress, resumeQuest } from '@unifor-quest/core'
import { describe, expect, it } from 'vitest'
import { campusDoors } from '../../src/renderer/src/content/campus-doors.js'
import { storyQuests, storyStops } from '../../src/renderer/src/content/story.js'

/**
 * A loaded game resumes in the scene of its next quest (ADR 0077). A quest without a stop
 * would send the player back to the portaria; a stop naming a scene no campus door leads to
 * would be a place the player could never walk into on their own.
 */
describe('story stops', () => {
  it('give every story quest a place to resume in', () => {
    for (const quest of storyQuests) {
      expect(storyStops[quest.id], quest.id).toBeDefined()
    }
  })

  it('only name places the campus has a door to', () => {
    const places = new Set(Object.values(campusDoors).map((door) => door.scene))
    for (const stop of Object.values(storyStops)) {
      expect(places).toContain(stop.scene)
    }
  })

  it('resume each step of the story in the next building', () => {
    const scenes = storyQuests.map((_, done) => {
      const progress = {
        ...emptyProgress,
        completedQuests: storyQuests.slice(0, done).map((quest) => quest.id),
        flags: storyQuests.slice(0, done).flatMap((quest) => quest.onSuccess.map((e) => e.flag)),
      }
      const quest = resumeQuest(storyQuests, progress)
      return quest === undefined ? undefined : storyStops[quest.id]?.scene
    })
    expect(scenes).toEqual([
      'entrada',
      'biblioteca',
      'centro-de-convivencia',
      'bloco-de-tecnologia',
    ])
  })
})
