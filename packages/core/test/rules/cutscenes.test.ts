import { describe, expect, it } from 'vitest'
import { type Cutscene, cutsceneSchema } from '../../src/entities/cutscene.js'
import { markCutsceneSeen, pendingCutscene } from '../../src/rules/cutscenes.js'
import { emptyProgress } from '../../src/value-objects/progress.js'

const opening: Cutscene = cutsceneSchema.parse({
  id: 'abertura',
  scene: 'entrada',
  steps: [{ kind: 'say', lines: [{ speaker: 'Davi', text: 'Bom dia!' }] }],
})

const ending: Cutscene = cutsceneSchema.parse({
  id: 'final',
  scene: 'bloco-de-tecnologia',
  requires: { quests: ['o-confronto'] },
  steps: [{ kind: 'fade', direction: 'out', ms: 500 }],
})

describe('cutsceneSchema', () => {
  it('requires nothing by default', () => {
    expect(opening.requires).toEqual({ quests: [], flags: [] })
  })

  it('rejects a cutscene with no steps', () => {
    expect(cutsceneSchema.safeParse({ id: 'x', scene: 'entrada', steps: [] }).success).toBe(false)
  })

  it('rejects a step outside the vocabulary', () => {
    const parsed = cutsceneSchema.safeParse({
      id: 'x',
      scene: 'entrada',
      steps: [{ kind: 'teleport', actor: 'davi' }],
    })
    expect(parsed.success).toBe(false)
  })
})

describe('pendingCutscene', () => {
  it('plays an opening that requires nothing on entering its scene', () => {
    expect(pendingCutscene([opening, ending], 'entrada', emptyProgress)).toBe(opening)
  })

  it('plays nothing in another scene', () => {
    expect(pendingCutscene([opening], 'campus', emptyProgress)).toBeUndefined()
  })

  it('waits until the requirements hold', () => {
    const scene = 'bloco-de-tecnologia'
    expect(pendingCutscene([ending], scene, emptyProgress)).toBeUndefined()
    const done = { ...emptyProgress, completedQuests: ['o-confronto'] }
    expect(pendingCutscene([ending], scene, done)).toBe(ending)
  })

  it('never plays a cutscene twice', () => {
    const seen = markCutsceneSeen(emptyProgress, opening)
    expect(pendingCutscene([opening], 'entrada', seen)).toBeUndefined()
  })

  it('plays the next one in order once the first was seen', () => {
    const second = { ...opening, id: 'abertura-2' }
    const seen = markCutsceneSeen(emptyProgress, opening)
    expect(pendingCutscene([opening, second], 'entrada', seen)).toBe(second)
  })
})

describe('markCutsceneSeen', () => {
  it('records the cutscene and leaves the rest of the progress alone', () => {
    const progress = { ...emptyProgress, flags: ['minimapa-liberado'] }
    expect(markCutsceneSeen(progress, opening)).toEqual({
      completedQuests: [],
      flags: ['minimapa-liberado'],
      seenCutscenes: ['abertura'],
    })
  })

  it('is a no-op the second time', () => {
    const seen = markCutsceneSeen(emptyProgress, opening)
    expect(markCutsceneSeen(seen, opening)).toBe(seen)
  })
})
