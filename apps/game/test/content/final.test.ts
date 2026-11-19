import { emptyProgress, markCutsceneSeen, type Progress, pendingCutscene } from '@unifor-quest/core'
import { describe, expect, it } from 'vitest'
import {
  epilogoCutscene,
  finalCutscene,
  oConfrontoQuest,
} from '../../src/renderer/src/content/bloco-de-tecnologia.js'
import { storyCutscenes, storyQuests } from '../../src/renderer/src/content/story.js'

/**
 * The ending (ADR 0076) is two cutscenes in two scenes, chained by a `cue` that changes
 * scene. These tests hold the chain together as data: each half is due where and when the
 * story says, and the steps that leave a scene are the last ones.
 */

/** Progress right after winning the duel, with every earlier quest and the opening behind. */
const afterTheDuel: Progress = {
  completedQuests: storyQuests.map((quest) => quest.id),
  flags: oConfrontoQuest.onSuccess.map((effect) => effect.flag),
  seenCutscenes: ['abertura'],
}

describe('the ending', () => {
  it('is part of the story', () => {
    expect(storyCutscenes).toContain(finalCutscene)
    expect(storyCutscenes).toContain(epilogoCutscene)
  })

  it('is not due before the duel', () => {
    const beforeTheDuel: Progress = {
      ...afterTheDuel,
      completedQuests: afterTheDuel.completedQuests.filter((id) => id !== oConfrontoQuest.id),
    }
    expect(pendingCutscene(storyCutscenes, 'bloco-de-tecnologia', beforeTheDuel)).toBeUndefined()
    expect(pendingCutscene(storyCutscenes, 'campus', beforeTheDuel)).toBeUndefined()
    expect(pendingCutscene(storyCutscenes, 'campus', emptyProgress)).toBeUndefined()
  })

  it('starts in the Bloco de Tecnologia right after the duel', () => {
    expect(pendingCutscene(storyCutscenes, 'bloco-de-tecnologia', afterTheDuel)).toBe(finalCutscene)
  })

  it('goes on in the campus, and only once', () => {
    const seenFinal = markCutsceneSeen(afterTheDuel, finalCutscene)
    expect(pendingCutscene(storyCutscenes, 'campus', seenFinal)).toBe(epilogoCutscene)

    const seenAll = markCutsceneSeen(seenFinal, epilogoCutscene)
    expect(pendingCutscene(storyCutscenes, 'campus', seenAll)).toBeUndefined()
    expect(pendingCutscene(storyCutscenes, 'bloco-de-tecnologia', seenAll)).toBeUndefined()
  })

  it('leaves each scene on its last step', () => {
    expect(finalCutscene.steps.at(-1)).toEqual({ kind: 'cue', name: 'volta-ao-campus' })
    expect(epilogoCutscene.steps.at(-1)).toEqual({ kind: 'cue', name: 'creditos' })
  })

  it('gives Davi his line in the epilogue, not in the duel panel', () => {
    const speakers = oConfrontoQuest.dialogue.success.map((line) => line.speaker)
    expect(speakers).not.toContain('Davi')
    const said = epilogoCutscene.steps.flatMap((step) => (step.kind === 'say' ? step.lines : []))
    expect(said).toContainEqual({
      speaker: 'Davi',
      text: 'Ué, as telas voltaram! Perdi alguma coisa?',
    })
  })
})
