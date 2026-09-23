// Contratos e regras puras do UNIFOR Quest.
//
// A organizacao interna separa por papel — value objects, entidades, regras e contratos de
// fronteira (ADR 0035) —, mas a superficie publica e plana: quem consome importa daqui.

export type { RunEnvelope, TestResult } from './contracts/run-envelope.js'
export { runEnvelopeSchema, testResultSchema } from './contracts/run-envelope.js'
export type { Quest } from './entities/quest.js'
export { questSchema } from './entities/quest.js'
export type { JsonValue } from './json.js'
export { jsonValueSchema } from './json.js'
export { jsonEquals } from './rules/json-equals.js'
export { validateValue } from './rules/validate-value.js'

export type { Challenge } from './value-objects/challenge.js'
export { challengeSchema } from './value-objects/challenge.js'
export type { DialogueLine } from './value-objects/dialogue-line.js'
export { dialogueLineSchema } from './value-objects/dialogue-line.js'
export type { Effect } from './value-objects/effect.js'
export { effectSchema } from './value-objects/effect.js'
export type { Graph, GraphEdge, GraphNode } from './value-objects/graph.js'
export { graphEdgeSchema, graphNodeSchema, graphSchema } from './value-objects/graph.js'
export type { LanguageId } from './value-objects/language-id.js'
export { languageIdSchema } from './value-objects/language-id.js'
export type { Parameter } from './value-objects/parameter.js'
export { parameterSchema } from './value-objects/parameter.js'
export type { TestCase } from './value-objects/test-case.js'
export { testCaseSchema } from './value-objects/test-case.js'
export type { StructField, TypeSpec } from './value-objects/type-spec.js'
export { formatTypeSpec, typeSpecSchema } from './value-objects/type-spec.js'
