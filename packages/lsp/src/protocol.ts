import { z } from 'zod'

/**
 * The slice of the Language Server Protocol this game speaks.
 *
 * Only what the editor actually uses is modelled: diagnostics, completion, hover,
 * signature help and formatting. A language server is an external process, so everything
 * coming back from it is validated before it becomes a type (ADR 0017) — and the
 * validation is deliberately narrow, because an unknown field is not a reason to throw
 * away a diagnostic.
 */

export const requestIdSchema = z.union([z.number(), z.string()])

export type RequestId = z.infer<typeof requestIdSchema>

export const lspMessageSchema = z.looseObject({
  jsonrpc: z.literal('2.0'),
  id: requestIdSchema.optional(),
  method: z.string().optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z.looseObject({ code: z.number(), message: z.string() }).optional(),
})

export type LspMessage = z.infer<typeof lspMessageSchema>

export const positionSchema = z.object({
  /** Zero-based, unlike Monaco, which counts from one. */
  line: z.number().int().nonnegative(),
  character: z.number().int().nonnegative(),
})

export type Position = z.infer<typeof positionSchema>

export const rangeSchema = z.object({ start: positionSchema, end: positionSchema })

export type Range = z.infer<typeof rangeSchema>

export const diagnosticSchema = z.looseObject({
  range: rangeSchema,
  /** 1 error, 2 warning, 3 information, 4 hint. Absent means the server left it open. */
  severity: z.number().int().optional(),
  message: z.string(),
  source: z.string().optional(),
})

export type Diagnostic = z.infer<typeof diagnosticSchema>

export const publishDiagnosticsSchema = z.looseObject({
  uri: z.string(),
  diagnostics: z.array(diagnosticSchema),
})

export type PublishDiagnostics = z.infer<typeof publishDiagnosticsSchema>

export const textEditSchema = z.object({ range: rangeSchema, newText: z.string() })

export type TextEdit = z.infer<typeof textEditSchema>

/** Either a plain string or `{ kind, value }`; servers use both, sometimes in one reply. */
export const markupSchema = z.union([
  z.string(),
  z.looseObject({ kind: z.string().optional(), value: z.string() }),
])

export const completionItemSchema = z.looseObject({
  label: z.string(),
  /** LSP's own numbering, which does not line up with Monaco's. */
  kind: z.number().int().optional(),
  detail: z.string().optional(),
  documentation: markupSchema.optional(),
  insertText: z.string().optional(),
  /** 2 means the insert text is a snippet. */
  insertTextFormat: z.number().int().optional(),
  textEdit: z.looseObject({ range: rangeSchema, newText: z.string() }).optional(),
  /**
   * Edits that come along with the completion, elsewhere in the file. This is how a server
   * adds the missing `import` when the player accepts a symbol from a package that is not
   * imported yet — ignoring it is the difference between auto-import working and not.
   */
  additionalTextEdits: z.array(textEditSchema).optional(),
  sortText: z.string().optional(),
  filterText: z.string().optional(),
  preselect: z.boolean().optional(),
})

export type CompletionItem = z.infer<typeof completionItemSchema>

/** Servers answer either with a bare array or with `{ items }`. Both are legal. */
export const completionResponseSchema = z.union([
  z.array(completionItemSchema),
  z.looseObject({ items: z.array(completionItemSchema) }),
  z.null(),
])

export const hoverSchema = z.looseObject({
  contents: z.union([markupSchema, z.array(markupSchema)]),
  range: rangeSchema.optional(),
})

export const signatureHelpSchema = z.looseObject({
  signatures: z.array(
    z.looseObject({
      label: z.string(),
      documentation: markupSchema.optional(),
      parameters: z
        .array(z.looseObject({ label: z.union([z.string(), z.tuple([z.number(), z.number()])]) }))
        .optional(),
    }),
  ),
  activeSignature: z.number().int().optional(),
  activeParameter: z.number().int().optional(),
})

export const formattingResponseSchema = z.union([z.array(textEditSchema), z.null()])

/**
 * The edits a code action wants applied. Servers use either shape, and `documentChanges`
 * is the one that carries a document version along with the edits.
 */
export const workspaceEditSchema = z.looseObject({
  changes: z.record(z.string(), z.array(textEditSchema)).optional(),
  documentChanges: z
    .array(
      z.looseObject({
        textDocument: z.looseObject({ uri: z.string() }),
        edits: z.array(z.looseObject({ range: rangeSchema, newText: z.string() })),
      }),
    )
    .optional(),
})

export type WorkspaceEdit = z.infer<typeof workspaceEditSchema>

export const codeActionSchema = z.looseObject({
  title: z.string(),
  kind: z.string().optional(),
  isPreferred: z.boolean().optional(),
  edit: workspaceEditSchema.optional(),
  /** Present when the server wants a `codeAction/resolve` round trip before giving edits. */
  data: z.unknown().optional(),
})

export type CodeAction = z.infer<typeof codeActionSchema>

/** A server may answer with plain commands mixed in; those carry no edits and are skipped. */
export const codeActionResponseSchema = z.union([
  z.array(z.union([codeActionSchema, z.looseObject({ command: z.string() })])),
  z.null(),
])

/** Every edit a workspace edit carries, flattened into `(uri, edit)` pairs. */
export function editsOf(edit: WorkspaceEdit): { uri: string; edit: TextEdit }[] {
  const flattened: { uri: string; edit: TextEdit }[] = []

  for (const [uri, edits] of Object.entries(edit.changes ?? {})) {
    for (const one of edits) {
      flattened.push({ uri, edit: one })
    }
  }

  for (const change of edit.documentChanges ?? []) {
    for (const one of change.edits) {
      flattened.push({ uri: change.textDocument.uri, edit: one })
    }
  }

  return flattened
}

/** Pulls readable text out of the several shapes a server may use for documentation. */
export function markupText(value: unknown): string {
  const parsed = markupSchema.safeParse(value)
  if (!parsed.success) {
    return ''
  }
  return typeof parsed.data === 'string' ? parsed.data : parsed.data.value
}
