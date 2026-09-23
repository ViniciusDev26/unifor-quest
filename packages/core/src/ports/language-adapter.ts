import type { Challenge } from '../value-objects/challenge.js'
import type { LanguageId } from '../value-objects/language-id.js'

/** A file the adapter wants written into the work directory before the run. */
export type GeneratedFile = {
  /** Relative to the work directory. */
  path: string
  contents: string
}

/**
 * A command, with the toolchain named logically rather than as a path. Turning `node` into
 * an actual executable is the runner's job: it differs between development and a packaged
 * app, and between platforms (ADR 0021).
 */
export type Command = {
  toolchain: string
  args: string[]
}

export type PreparedRun = {
  files: GeneratedFile[]
  /** `null` for languages that run straight from source, like Java (ADR 0023). */
  compile: Command | null
  run: Command
}

/**
 * Everything that is specific to one language lives behind this port (ADR 0005). Adding a
 * language costs one implementation of it, never a change per quest (ADR 0003).
 */
export interface LanguageAdapter {
  readonly id: LanguageId

  /** The code the player sees the first time they open the challenge. */
  stub(challenge: Challenge): string

  /** The files and commands for one run. Generated files are never edited by hand. */
  prepare(input: { challenge: Challenge; playerCode: string; nonce: string }): PreparedRun
}
