import { describe, expect, it } from 'vitest'
import {
  createSave,
  migrate,
  migrations,
  parseSave,
  parseSaveText,
  SAVE_VERSION,
  withQuestCode,
} from '../../src/contracts/save.js'
import { emptyProgress } from '../../src/value-objects/progress.js'

const progress = {
  completedQuests: ['placas-embaralhadas'],
  flags: ['minimapa-liberado'],
  seenCutscenes: ['abertura'],
}

const code = {
  'placas-embaralhadas': {
    typescript: [{ path: 'solution.ts', contents: 'export function decodeSign() {}' }],
  },
}

describe('createSave', () => {
  it('stamps the current version on the progress and the code', () => {
    expect(createSave(progress, code)).toEqual({ version: SAVE_VERSION, progress, code })
  })
})

describe('withQuestCode', () => {
  it('replaces one quest and keeps the others', () => {
    const go = { go: [{ path: 'solution.go', contents: 'package main' }] }
    const next = withQuestCode(code, 'outra-quest', go)

    expect(next).toEqual({ ...code, 'outra-quest': go })
    expect(withQuestCode(next, 'outra-quest', {})['outra-quest']).toEqual({})
  })

  it('does not mutate the code it was given', () => {
    withQuestCode(code, 'outra-quest', {})
    expect(Object.keys(code)).toEqual(['placas-embaralhadas'])
  })
})

describe('parseSaveText', () => {
  it('reads back what createSave wrote', () => {
    const save = createSave(progress, code)
    expect(parseSaveText(JSON.stringify(save))).toEqual({ kind: 'ok', save })
  })

  it('says there is no save when there is no file', () => {
    expect(parseSaveText(null)).toEqual({ kind: 'missing' })
  })

  it('refuses text that is not JSON', () => {
    expect(parseSaveText('{"version": 1,').kind).toBe('invalid')
  })

  it('fills in what an older file of the same version left out', () => {
    const parsed = parseSaveText(JSON.stringify({ version: 1, progress: {} }))
    expect(parsed).toEqual({ kind: 'ok', save: { version: 1, progress: emptyProgress, code: {} } })
  })
})

describe('parseSave', () => {
  it('refuses a value with no version', () => {
    expect(parseSave({ progress }).kind).toBe('invalid')
    expect(parseSave(null).kind).toBe('invalid')
    expect(parseSave({ version: 0, progress }).kind).toBe('invalid')
  })

  it('does not load a save from a newer build', () => {
    expect(parseSave({ version: SAVE_VERSION + 1, progress })).toEqual({
      kind: 'newer',
      version: SAVE_VERSION + 1,
    })
  })

  it('refuses a save edited into something else', () => {
    const edited = { ...createSave(progress, code), progress: { completedQuests: 'all' } }
    expect(parseSave(edited).kind).toBe('invalid')
  })

  it('refuses code in a language the game does not have', () => {
    const edited = createSave(progress, {})
    expect(
      parseSave({ ...edited, code: { q: { javascript: [{ path: 'a.js', contents: '' }] } } }).kind,
    ).toBe('invalid')
  })
})

describe('migrations', () => {
  it('has one step per version before the current one', () => {
    expect(SAVE_VERSION).toBe(migrations.length + 1)
  })

  it('walks a save through every later step, in order', () => {
    const steps = [
      (old: unknown) => ({ from: old, step: 2 }),
      (old: unknown) => ({ from: old, step: 3 }),
    ]

    expect(migrate('v1', 1, steps)).toEqual({ from: { from: 'v1', step: 2 }, step: 3 })
    expect(migrate('v2', 2, steps)).toEqual({ from: 'v2', step: 3 })
    expect(migrate('v3', 3, steps)).toBe('v3')
  })
})
