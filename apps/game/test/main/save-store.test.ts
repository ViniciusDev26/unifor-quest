import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSave, emptyProgress, parseSaveText } from '@unifor-quest/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createSaveStore, SAVE_FILE } from '../../src/main/save-store.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'unifor-quest-save-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const save = createSave(
  { completedQuests: ['placas-embaralhadas'], flags: ['minimapa-liberado'], seenCutscenes: [] },
  { 'placas-embaralhadas': { go: [{ path: 'solution.go', contents: 'package main' }] } },
)

describe('createSaveStore', () => {
  it('has nothing to read before the first save', async () => {
    expect(await createSaveStore(dir).read()).toBeNull()
  })

  it('reads back what it wrote', async () => {
    const store = createSaveStore(dir)

    expect(await store.write(save)).toEqual({ ok: true })
    expect(parseSaveText(await store.read())).toEqual({ kind: 'ok', save })
  })

  it('replaces the previous save and leaves no temporary file behind', async () => {
    const store = createSaveStore(dir)
    await store.write(createSave(emptyProgress, {}))
    await store.write(save)

    expect(await readdir(dir)).toEqual([SAVE_FILE])
    expect(parseSaveText(await store.read())).toEqual({ kind: 'ok', save })
  })

  it('creates the directory when it does not exist yet', async () => {
    const store = createSaveStore(join(dir, 'UNIFOR Quest'))

    expect(await store.write(save)).toEqual({ ok: true })
  })

  it('never overwrites a save from a newer build', async () => {
    const newer = JSON.stringify({ version: 99, progress: emptyProgress })
    await writeFile(join(dir, SAVE_FILE), newer)

    expect(await createSaveStore(dir).write(save)).toEqual({
      ok: false,
      reason: 'newer',
      version: 99,
    })
    expect(await readFile(join(dir, SAVE_FILE), 'utf8')).toBe(newer)
  })

  it('writes over a corrupt save, which is no progress to keep', async () => {
    await writeFile(join(dir, SAVE_FILE), '{"version": 1,')

    expect(await createSaveStore(dir).write(save)).toEqual({ ok: true })
  })

  it('reports a failure instead of throwing', async () => {
    // A file where the directory should be: nothing can be written inside it.
    const blocked = join(dir, 'blocked')
    await writeFile(blocked, '')

    const outcome = await createSaveStore(blocked).write(save)
    expect(outcome.ok).toBe(false)
  })
})
