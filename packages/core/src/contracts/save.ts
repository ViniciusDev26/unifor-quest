import { z } from 'zod'
import { languageIdSchema } from '../value-objects/language-id.js'
import { type Progress, progressSchema } from '../value-objects/progress.js'

/**
 * The version this build writes. Bumping it means a new shape and a new entry in
 * `migrations`, from the previous version to this one (ADR 0072).
 */
export const SAVE_VERSION = 1

/** One file the player edits, as text. What the adapter generates never goes in (ADR 0072). */
export const savedFileSchema = z.object({
  path: z.string().min(1),
  contents: z.string(),
})

export type SavedFile = z.infer<typeof savedFileSchema>

/**
 * The player's code for one quest, one entry per language they wrote in: the TypeScript
 * attempt is not the Go one, and replaying in another language keeps both (ADR 0030).
 */
export const questCodeSchema = z.partialRecord(languageIdSchema, z.array(savedFileSchema).min(1))

export type QuestCode = z.infer<typeof questCodeSchema>

/** The player's code across the game, by quest id. */
export const saveCodeSchema = z.record(z.string().min(1), questCodeSchema)

export type SaveCode = z.infer<typeof saveCodeSchema>

/**
 * The one save there is (ADR 0072): the whole `Progress` and the player's code by quest and
 * by language. Written on every completed quest, never by hand (ADR 0020).
 */
export const saveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  progress: progressSchema,
  code: saveCodeSchema.default({}),
})

export type Save = z.infer<typeof saveSchema>

export function createSave(progress: Progress, code: SaveCode): Save {
  return { version: SAVE_VERSION, progress, code }
}

/** The save with one quest's code replaced, leaving every other quest as it was. */
export function withQuestCode(code: SaveCode, questId: string, questCode: QuestCode): SaveCode {
  return { ...code, [questId]: questCode }
}

/**
 * One migration takes a save one version up. It takes and returns `unknown`: the input is an
 * old shape this build has no type for anymore, and the result is only trusted after
 * `saveSchema` (ADR 0017).
 */
export type Migration = (old: unknown) => unknown

/**
 * One step per old version, in order: `migrations[0]` takes a version 1 save to version 2,
 * and so on, so `SAVE_VERSION` is always `migrations.length + 1`. Empty while there is one
 * version.
 */
export const migrations: readonly Migration[] = []

/** Walks a save written at `version` through every later step of `steps`, in order. */
export function migrate(raw: unknown, version: number, steps: readonly Migration[]): unknown {
  return steps.slice(version - 1).reduce((save, step) => step(save), raw)
}

export type SaveParse =
  | { kind: 'ok'; save: Save }
  /** No save on disk: a new player. */
  | { kind: 'missing' }
  /** Written by a newer build. Neither loaded nor overwritten (ADR 0072). */
  | { kind: 'newer'; version: number }
  /** Not a save this build understands: edited by hand, truncated, or not JSON at all. */
  | { kind: 'invalid'; detail: string }

const versionedSchema = z.looseObject({ version: z.number().int().positive() })

/**
 * Turns what was read from disk into a save, or says why it is not one. The file is
 * external data, so it enters as text and becomes a `Save` only after validation (ADR 0017,
 * ADR 0072). `null` means there was no file.
 */
export function parseSaveText(text: string | null): SaveParse {
  if (text === null) {
    return { kind: 'missing' }
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (cause) {
    return { kind: 'invalid', detail: String(cause) }
  }

  return parseSave(raw)
}

/** Same as `parseSaveText`, for a value that is already parsed JSON. */
export function parseSave(raw: unknown): SaveParse {
  const versioned = versionedSchema.safeParse(raw)
  if (!versioned.success) {
    return { kind: 'invalid', detail: 'save has no version' }
  }

  const { version } = versioned.data
  if (version > SAVE_VERSION) {
    return { kind: 'newer', version }
  }

  const validated = saveSchema.safeParse(migrate(raw, version, migrations))
  if (!validated.success) {
    return { kind: 'invalid', detail: z.prettifyError(validated.error) }
  }

  return { kind: 'ok', save: validated.data }
}
