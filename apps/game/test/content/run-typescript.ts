import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Challenge, evaluateSubmission, type Submission } from '@unifor-quest/core'
import { typescriptAdapter } from '@unifor-quest/lang-typescript'
import { createLocalExecutor } from '@unifor-quest/runner'

/**
 * Runs a TypeScript solution through the real adapter and runner, the way the game does,
 * so what a content test checks is what the player would get. TypeScript needs nothing but
 * the Node already running the tests.
 */
export function createTypeScriptRunner(): {
  submit: (challenge: Challenge, solution: string) => Promise<Submission>
  dispose: () => void
} {
  const workDir = mkdtempSync(join(tmpdir(), 'unifor-quest-content-'))
  const executor = createLocalExecutor({
    workDir,
    adapters: [typescriptAdapter],
    resolveToolchain: () => ({ executable: process.execPath }),
  })

  return {
    async submit(challenge, solution) {
      const project = typescriptAdapter.scaffold(challenge)
      const playerFiles = project.files.map((file) =>
        file.path === project.entry ? { ...file, contents: solution } : file,
      )
      const envelope = await executor.run({ challenge, language: 'typescript', playerFiles })
      return evaluateSubmission(challenge, envelope)
    },
    dispose: () => rmSync(workDir, { recursive: true, force: true }),
  }
}
