import { type Executor, evaluateSubmission, type LanguageAdapter } from '@unifor-quest/core'
import { type Expectation, type Scenario, scenarios } from './scenarios.js'

export type ScenarioOutcome = {
  scenario: string
  passed: boolean
  /** Why it failed, in the order the expectations were declared. */
  problems: string[]
}

export type ConformanceReport = {
  language: string
  passed: boolean
  outcomes: ScenarioOutcome[]
}

const DEFAULT_RUN_TIMEOUT_MS = 10_000

/**
 * Runs every scenario against one adapter.
 *
 * A scenario with no solution for this language uses the project the adapter scaffolds,
 * which is how "the untouched project runs" gets tested without writing it four times.
 */
export async function runConformance(
  adapter: LanguageAdapter,
  makeExecutor: (runTimeoutMs: number) => Executor,
): Promise<ConformanceReport> {
  const outcomes: ScenarioOutcome[] = []

  for (const scenario of scenarios) {
    const executor = makeExecutor(scenario.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS)
    outcomes.push(await runScenario(adapter, executor, scenario))
  }

  return {
    language: adapter.id,
    passed: outcomes.every((outcome) => outcome.passed),
    outcomes,
  }
}

async function runScenario(
  adapter: LanguageAdapter,
  executor: Executor,
  scenario: Scenario,
): Promise<ScenarioOutcome> {
  const solution = scenario.solutions[adapter.id]
  const scaffold = adapter.scaffold(scenario.challenge)

  // A solution replaces the files it names and keeps the rest of the scaffolded project —
  // which is how `go.mod` and the graph prelude survive without every scenario repeating
  // them.
  const playerFiles =
    solution === undefined
      ? scaffold.files
      : [
          ...scaffold.files.filter((file) => !solution.some((one) => one.path === file.path)),
          ...solution,
        ]

  const envelope = await executor.run({
    challenge: scenario.challenge,
    language: adapter.id,
    playerFiles,
  })

  const submission = evaluateSubmission(scenario.challenge, envelope)
  const problems: string[] = []

  for (const expectation of scenario.expect) {
    const problem = check(expectation, submission, envelope.playerStdout)
    if (problem !== null) {
      problems.push(problem)
    }
  }

  return { scenario: scenario.name, passed: problems.length === 0, problems }
}

function check(
  expectation: Expectation,
  submission: ReturnType<typeof evaluateSubmission>,
  playerStdout: string,
): string | null {
  switch (expectation.kind) {
    case 'solved':
      return submission.solved ? null : `esperava resolver, veio ${describe(submission)}`

    case 'failed':
      return submission.solved ? 'esperava falhar, e passou' : null

    case 'wrongAnswer':
      if (submission.solved) {
        return 'esperava resposta errada, e passou'
      }
      return submission.error === null
        ? null
        : `esperava resposta errada sem erro, veio erro: ${submission.error}`

    case 'error':
      if (submission.error === null) {
        return `esperava erro contendo "${expectation.contains}", nao veio erro nenhum`
      }
      return submission.error.includes(expectation.contains)
        ? null
        : `erro nao menciona "${expectation.contains}": ${submission.error}`

    case 'stdout':
      return playerStdout.includes(expectation.contains)
        ? null
        : `a saida do jogador nao contem "${expectation.contains}": ${JSON.stringify(playerStdout)}`

    case 'opsAbove':
      return submission.totalOps > expectation.count
        ? null
        : `esperava mais de ${expectation.count} operacoes, veio ${submission.totalOps}`

    default: {
      const unreachable: never = expectation
      return unreachable
    }
  }
}

function describe(submission: ReturnType<typeof evaluateSubmission>): string {
  if (submission.error !== null) {
    return `erro: ${submission.error}`
  }
  const failed = submission.outcomes.filter((outcome) => !outcome.passed)
  return failed
    .map(
      (outcome) =>
        `${outcome.name}: esperava ${JSON.stringify(outcome.expected)}, veio ${JSON.stringify(outcome.actual)}`,
    )
    .join('; ')
}
