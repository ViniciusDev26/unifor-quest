import type { Challenge } from '../value-objects/challenge.js'
import type { LanguageId } from '../value-objects/language-id.js'

/** A file the adapter wants written into the work directory before the run. */
export type GeneratedFile = {
  /** Relative to the work directory. */
  path: string
  contents: string
}

/**
 * A command to run.
 *
 * `toolchain` names the tool logically rather than by path: turning `go` into an actual
 * executable is the runner's job, because it differs between development and a packaged
 * app, and between platforms (ADR 0021).
 *
 * `artifact` runs something the compile step just produced, found inside the work
 * directory. A compiled language needs both: `go` to build, then the binary to run.
 */
export type Command =
  | { kind: 'toolchain'; toolchain: string; args: string[] }
  | { kind: 'artifact'; path: string; args: string[] }

export type PreparedRun = {
  files: GeneratedFile[]
  /** `null` for languages that run straight from source, like Java (ADR 0023). */
  compile: Command | null
  run: Command
}

/**
 * What the player starts with: a real project of that language, not a single file
 * (ADR 0046). The editor opens `entry`, and everything else is the player's space.
 */
export type Project = {
  files: GeneratedFile[]
  /** The file holding the function the challenge declares. */
  entry: string
}

/**
 * How to start a language server for this language, and the workspace it needs on disk to
 * make sense of the file being edited.
 *
 * Optional on purpose: TypeScript has no entry here, because Monaco already embeds a full
 * TypeScript service in a worker. A server is only worth its weight where the editor knows
 * nothing about the language.
 */
export type LanguageServer = {
  command: Command

  /** Written once into the editing workspace, so the server sees a valid project. */
  workspaceFiles: GeneratedFile[]

  /** The file the player edits, relative to the workspace. */
  documentPath: string

  /** The language identifier the server expects, which is the server's own, not ours. */
  documentLanguageId: string
}

/**
 * Everything that is specific to one language lives behind this port (ADR 0005). Adding a
 * language costs one implementation of it, never a change per quest (ADR 0003).
 */
export interface LanguageAdapter {
  readonly id: LanguageId

  /** The project the player starts from, the first time they open the challenge. */
  scaffold(challenge: Challenge): Project

  /**
   * The files and commands for one run: the player's project plus whatever the harness
   * needs. Generated files are never edited by hand.
   */
  prepare(input: {
    challenge: Challenge
    playerFiles: readonly GeneratedFile[]
    nonce: string
  }): PreparedRun

  /** A language server for the editor, when the language needs one. */
  languageServer?(input: { challenge: Challenge }): LanguageServer
}
