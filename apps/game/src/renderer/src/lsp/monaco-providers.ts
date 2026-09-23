import {
  completionResponseSchema,
  type Diagnostic,
  formattingResponseSchema,
  hoverSchema,
  type Range as LspRange,
  markupText,
  signatureHelpSchema,
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

      return {
        suggestions: items.map((item) => ({
          label: item.label,
          kind: toCompletionKind(item.kind),
          insertText: item.textEdit?.newText ?? item.insertText ?? item.label,
          range: item.textEdit === undefined ? fallback : toMonacoRange(item.textEdit.range),
          detail: item.detail ?? '',
          documentation: { value: markupText(item.documentation) },
          sortText: item.sortText ?? item.label,
          filterText: item.filterText ?? item.label,
          preselect: item.preselect ?? false,
          // Spread instead of assigning undefined: exactOptionalPropertyTypes is on.
          ...(item.insertTextFormat === 2
            ? {
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              }
            : {}),
        })),
      }
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
