import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseSaveText, type Save } from '@unifor-quest/core'

export const SAVE_FILE = 'save.json'

export type SaveWrite =
  | { ok: true }
  /** The file on disk came from a newer build: it is kept, not overwritten (ADR 0072). */
  | { ok: false; reason: 'newer'; version: number }
  | { ok: false; reason: 'failed'; detail: string }

export type SaveStore = {
  /** The save file's text, or `null` when there is none yet. Validation is the caller's. */
  read: () => Promise<string | null>
  write: (save: Save) => Promise<SaveWrite>
}

/**
 * The one save there is, as a JSON file in `dir` (`userData`, ADR 0026). No Electron in
 * here, so it runs in a test with a temporary directory.
 */
export function createSaveStore(dir: string): SaveStore {
  const file = join(dir, SAVE_FILE)
  const temporary = `${file}.tmp`

  const read = async (): Promise<string | null> => {
    try {
      return await readFile(file, 'utf8')
    } catch (cause) {
      if (isMissing(cause)) {
        return null
      }
      throw cause
    }
  }

  const write = async (save: Save): Promise<SaveWrite> => {
    try {
      const existing = parseSaveText(await read())
      if (existing.kind === 'newer') {
        return { ok: false, reason: 'newer', version: existing.version }
      }

      // Temporary file, then rename: a crash halfway leaves the old save whole, never a
      // truncated one, right at the moment the player made progress (ADR 0020).
      await mkdir(dir, { recursive: true })
      await writeFile(temporary, `${JSON.stringify(save, null, 2)}\n`, 'utf8')
      await rename(temporary, file)
      return { ok: true }
    } catch (cause) {
      return { ok: false, reason: 'failed', detail: String(cause) }
    }
  }

  return { read, write }
}

function isMissing(cause: unknown): boolean {
  return cause instanceof Error && 'code' in cause && cause.code === 'ENOENT'
}
