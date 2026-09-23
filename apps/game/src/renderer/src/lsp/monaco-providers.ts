import {
  type CodeAction,
  type CompletionItem,
  codeActionResponseSchema,
  codeActionSchema,
  completionItemSchema,
  completionResponseSchema,
  type Diagnostic,
  editsOf,
  formattingResponseSchema,
  hoverSchema,
  type Range as LspRange,
  markupText,
  signatureHelpSchema,
  type TextEdit,
} from '@unifor-quest/lsp/protocol'
import * as monaco from 'monaco-editor'
import type { LspClient } from './client.js'

/**
 * Translates between a language server and Monaco.
 *
 * This is the whole reason the game can stay on the official `monaco-editor` instead of the
 * VS Code fork that `monaco-languageclient` requires (ADR 0044): the protocol is
 * JSON-RPC, Monaco already has the extension points, and what sits in between is this
 * file — mostly the two numbering systems disagreeing.
 *
 * Positions in LSP count from zero; Monaco counts lines and columns from one.
 */

function toMonacoRange(range: LspRange): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  }
}

function toLspPosition(position: monaco.Position): { line: number; character: number } {
  return { line: position.lineNumber - 1, character: position.column - 1 }
}

function toMarkerSeverity(severity: number | undefined): monaco.MarkerSeverity {
  switch (severity) {
    case 1:
      return monaco.MarkerSeverity.Error
    case 2:
      return monaco.MarkerSeverity.Warning
    case 3:
      return monaco.MarkerSeverity.Info
    case 4:
      return monaco.MarkerSeverity.Hint
    default:
      return monaco.MarkerSeverity.Error
  }
}

/** LSP and Monaco both number completion kinds, and they disagree. Map by name. */
const COMPLETION_KINDS: readonly monaco.languages.CompletionItemKind[] = [
  monaco.languages.CompletionItemKind.Text,
  monaco.languages.CompletionItemKind.Method,
  monaco.languages.CompletionItemKind.Function,
  monaco.languages.CompletionItemKind.Constructor,
  monaco.languages.CompletionItemKind.Field,
  monaco.languages.CompletionItemKind.Variable,
  monaco.languages.CompletionItemKind.Class,
  monaco.languages.CompletionItemKind.Interface,
  monaco.languages.CompletionItemKind.Module,
  monaco.languages.CompletionItemKind.Property,
  monaco.languages.CompletionItemKind.Unit,
  monaco.languages.CompletionItemKind.Value,
  monaco.languages.CompletionItemKind.Enum,
  monaco.languages.CompletionItemKind.Keyword,
  monaco.languages.CompletionItemKind.Snippet,
  monaco.languages.CompletionItemKind.Color,
  monaco.languages.CompletionItemKind.File,
  monaco.languages.CompletionItemKind.Reference,
  monaco.languages.CompletionItemKind.Folder,
  monaco.languages.CompletionItemKind.EnumMember,
  monaco.languages.CompletionItemKind.Constant,
  monaco.languages.CompletionItemKind.Struct,
  monaco.languages.CompletionItemKind.Event,
  monaco.languages.CompletionItemKind.Operator,
  monaco.languages.CompletionItemKind.TypeParameter,
]

function toCompletionKind(kind: number | undefined): monaco.languages.CompletionItemKind {
  return COMPLETION_KINDS[(kind ?? 1) - 1] ?? monaco.languages.CompletionItemKind.Text
}

/** LSP text edits, as Monaco's editor operations. */
function toEditOperations(edits: readonly TextEdit[]): monaco.languages.TextEdit[] {
  return edits.map((edit) => ({ range: toMonacoRange(edit.range), text: edit.newText }))
}

/** Asks the server to fill in the edits it left out, when it left them out. */
async function resolveEdits(
  client: LspClient,
  action: CodeAction,
): Promise<ReturnType<typeof editsOf> | undefined> {
  if (action.edit !== undefined) {
    return editsOf(action.edit)
  }
  if (action.data === undefined) {
    return undefined
  }

  const resolved = codeActionSchema.safeParse(await client.request('codeAction/resolve', action))
  return resolved.success && resolved.data.edit !== undefined
    ? editsOf(resolved.data.edit)
    : undefined
}

/**
 * Edits come back addressed to the file on disk that the server watches, while Monaco
 * addresses its own in-memory model. Only edits for our document are kept, and they are
 * re-pointed at the model.
 */
function toMonacoEdits(
  model: monaco.editor.ITextModel,
  documentUri: string,
  edits: ReturnType<typeof editsOf>,
): monaco.languages.IWorkspaceTextEdit[] {
  return edits
    .filter((entry) => entry.uri === documentUri)
    .map((entry) => ({
      resource: model.uri,
      versionId: undefined,
      textEdit: { range: toMonacoRange(entry.edit.range), text: entry.edit.newText },
    }))
}

/** Paints the diagnostics a server published onto the model (ADR 0005). */
export function applyDiagnostics(
  model: monaco.editor.ITextModel,
  owner: string,
  diagnostics: readonly Diagnostic[],
): void {
  monaco.editor.setModelMarkers(
    model,
    owner,
    diagnostics.map((diagnostic) => ({
      ...toMonacoRange(diagnostic.range),
      message: diagnostic.message,
      severity: toMarkerSeverity(diagnostic.severity),
      source: diagnostic.source ?? owner,
    })),
  )
}

/**
 * Registers the providers for a Monaco language. `current` is asked on every call instead
 * of captured, because the player switches languages and the panel reconnects.
 */
export function registerProviders(
  monacoLanguageId: string,
  current: () => LspClient | undefined,
): void {
  const ask = async (method: string, position: monaco.Position): Promise<unknown> => {
    const client = current()
    if (client === undefined) {
      return null
    }
    return client.request(method, {
      textDocument: { uri: client.documentUri },
      position: toLspPosition(position),
    })
  }

  // Keeps the server's own item next to the one Monaco shows, so a resolve round trip can
  // find it again without stuffing extra fields into Monaco's object.
  const sourceItems = new WeakMap<monaco.languages.CompletionItem, CompletionItem>()

  monaco.languages.registerCompletionItemProvider(monacoLanguageId, {
    triggerCharacters: ['.'],

    async provideCompletionItems(model, position) {
      const parsed = completionResponseSchema.safeParse(
        await ask('textDocument/completion', position),
      )
      if (!parsed.success || parsed.data === null) {
        return { suggestions: [] }
      }

      const items = Array.isArray(parsed.data) ? parsed.data : parsed.data.items
      const word = model.getWordUntilPosition(position)
      const fallback: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions = items.map((item) => {
        const suggestion: monaco.languages.CompletionItem = {
          label: item.label,
          kind: toCompletionKind(item.kind),
          insertText: item.textEdit?.newText ?? item.insertText ?? item.label,
          range: item.textEdit === undefined ? fallback : toMonacoRange(item.textEdit.range),
          detail: item.detail ?? '',
          documentation: { value: markupText(item.documentation) },
          sortText: item.sortText ?? item.label,
          filterText: item.filterText ?? item.label,
          preselect: item.preselect ?? false,
          // This is the auto-import: the edit that adds `import "fmt"` at the top while the
          // completion itself is inserted at the cursor.
          ...(item.additionalTextEdits === undefined
            ? {}
            : { additionalTextEdits: toEditOperations(item.additionalTextEdits) }),
          // Spread instead of assigning undefined: exactOptionalPropertyTypes is on.
          ...(item.insertTextFormat === 2
            ? {
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              }
            : {}),
        }

        sourceItems.set(suggestion, item)
        return suggestion
      })

      return { suggestions }
    },

    /**
     * Asked once, for the item the player is about to accept. A server that deferred the
     * import edit hands it over here — which is why accepting `fmt.Println` can add the
     * import even though the first answer carried nothing.
     */
    async resolveCompletionItem(item) {
      const client = current()
      const source = sourceItems.get(item)
      if (client === undefined || source === undefined) {
        return item
      }

      const parsed = completionItemSchema.safeParse(
        await client.request('completionItem/resolve', source),
      )
      if (!parsed.success || parsed.data.additionalTextEdits === undefined) {
        return item
      }

      return { ...item, additionalTextEdits: toEditOperations(parsed.data.additionalTextEdits) }
    },
  })

  monaco.languages.registerHoverProvider(monacoLanguageId, {
    async provideHover(_model, position) {
      const parsed = hoverSchema.safeParse(await ask('textDocument/hover', position))
      if (!parsed.success) {
        return null
      }

      const contents = Array.isArray(parsed.data.contents)
        ? parsed.data.contents
        : [parsed.data.contents]

      return {
        contents: contents.map((entry) => ({ value: markupText(entry) })),
        ...(parsed.data.range === undefined ? {} : { range: toMonacoRange(parsed.data.range) }),
      }
    },
  })

  monaco.languages.registerSignatureHelpProvider(monacoLanguageId, {
    signatureHelpTriggerCharacters: ['(', ','],

    async provideSignatureHelp(_model, position) {
      const parsed = signatureHelpSchema.safeParse(
        await ask('textDocument/signatureHelp', position),
      )
      if (!parsed.success) {
        return null
      }

      return {
        value: {
          signatures: parsed.data.signatures.map((signature) => ({
            label: signature.label,
            documentation: { value: markupText(signature.documentation) },
            parameters: (signature.parameters ?? []).map((parameter) => ({
              label: parameter.label,
            })),
          })),
          activeSignature: parsed.data.activeSignature ?? 0,
          activeParameter: parsed.data.activeParameter ?? 0,
        },
        dispose: () => undefined,
      }
    },
  })

  /**
   * The lightbulb, and `Ctrl+.`. Monaco asks what can be done about the markers under the
   * cursor; the server answers with edits, and Monaco applies them.
   *
   * A server may answer with a title and no edits, expecting a second round trip
   * (`codeAction/resolve`) before committing to them — `gopls` does this for imports.
   */
  monaco.languages.registerCodeActionProvider(monacoLanguageId, {
    async provideCodeActions(model, range, context) {
      const client = current()
      if (client === undefined) {
        return { actions: [], dispose: () => undefined }
      }

      const response = await client.request('textDocument/codeAction', {
        textDocument: { uri: client.documentUri },
        range: {
          start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
          end: { line: range.endLineNumber - 1, character: range.endColumn - 1 },
        },
        context: {
          diagnostics: context.markers.map((marker) => ({
            range: {
              start: { line: marker.startLineNumber - 1, character: marker.startColumn - 1 },
              end: { line: marker.endLineNumber - 1, character: marker.endColumn - 1 },
            },
            message: marker.message,
            severity: 1,
          })),
        },
      })

      const parsed = codeActionResponseSchema.safeParse(response)
      if (!parsed.success || parsed.data === null) {
        return { actions: [], dispose: () => undefined }
      }

      const actions: monaco.languages.CodeAction[] = []

      for (const entry of parsed.data) {
        const action = codeActionSchema.safeParse(entry)
        if (!action.success) {
          continue
        }

        const resolved = await resolveEdits(client, action.data)
        const edits =
          resolved === undefined ? [] : toMonacoEdits(model, client.documentUri, resolved)

        if (edits.length === 0) {
          continue
        }

        actions.push({
          title: action.data.title,
          ...(action.data.kind === undefined ? {} : { kind: action.data.kind }),
          ...(action.data.isPreferred === undefined
            ? {}
            : { isPreferred: action.data.isPreferred }),
          edit: { edits },
        })
      }

      return { actions, dispose: () => undefined }
    },
  })

  monaco.languages.registerDocumentFormattingEditProvider(monacoLanguageId, {
    async provideDocumentFormattingEdits() {
      const client = current()
      if (client === undefined) {
        return []
      }

      const response = await client.request('textDocument/formatting', {
        textDocument: { uri: client.documentUri },
        options: { tabSize: 4, insertSpaces: false },
      })

      const parsed = formattingResponseSchema.safeParse(response)
      if (!parsed.success || parsed.data === null) {
        return []
      }

      return parsed.data.map((edit) => ({
        range: toMonacoRange(edit.range),
        text: edit.newText,
      }))
    },
  })
}
