import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker'

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment
  }
}

window.MonacoEnvironment = {
  getWorker(_id, label) {
    return label === 'typescript' || label === 'javascript' ? new tsWorker() : new editorWorker()
  },
}

registerElixir()
configureTypeScript()

/**
 * The project the player edits imports its siblings the way Node runs them, extension
 * included (`import type { Graph } from './graph.ts'`, ADR 0054). Monaco's embedded
 * TypeScript service rejects that by default; these options match how the code really runs.
 */
function configureTypeScript(): void {
  monaco.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.typescript.ScriptTarget.ES2020,
    module: monaco.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
    allowImportingTsExtensions: true,
    noEmit: true,
    strict: true,
    allowNonTsExtensions: true,
  })
}

/**
 * Makes a project file other than the one being edited visible to the TypeScript service,
 * at its real path next to the editor's model, so imports between them resolve. Each path
 * is registered once: the files besides the player's own (the prelude) never change.
 */
const siblingFiles = new Set<string>()

export function addSiblingFile(path: string, contents: string): void {
  if (siblingFiles.has(path)) {
    return
  }
  siblingFiles.add(path)
  monaco.typescript.typescriptDefaults.addExtraLib(contents, monaco.Uri.file(path).toString())
}

/**
 * `monaco-editor`'s bundled `basic-languages` set has no Elixir tokenizer, unlike the other
 * three languages this game ships (ADR 0056). This is enough for the player to read their
 * own code with syntax colours — the language server (ElixirLS) still does the real
 * analysis, the same division as everywhere else (ADR 0044).
 */
function registerElixir(): void {
  monaco.languages.register({ id: 'elixir' })

  monaco.languages.setLanguageConfiguration('elixir', {
    comments: { lineComment: '#' },
    brackets: [
      ['(', ')'],
      ['[', ']'],
      ['{', '}'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  })

  monaco.languages.setMonarchTokensProvider('elixir', {
    defaultToken: '',
    keywords: [
      'def',
      'defp',
      'defmodule',
      'defstruct',
      'defprotocol',
      'defimpl',
      'defmacro',
      'defmacrop',
      'defguard',
      'defguardp',
      'defdelegate',
      'defoverridable',
      'defexception',
      'do',
      'end',
      'fn',
      'when',
      'if',
      'unless',
      'case',
      'cond',
      'else',
      'true',
      'false',
      'nil',
      'try',
      'catch',
      'rescue',
      'after',
      'raise',
      'throw',
      'import',
      'require',
      'use',
      'alias',
      'quote',
      'unquote',
      'unquote_splicing',
      'super',
      'receive',
      'with',
      'for',
      'in',
      'not',
      'and',
      'or',
    ],

    operators: [
      '|>',
      '->',
      '<-',
      '==',
      '!=',
      '===',
      '!==',
      '<=',
      '>=',
      '&&',
      '||',
      '!',
      '=',
      '+',
      '-',
      '*',
      '/',
      '++',
      '--',
      '<>',
      '..',
      '|',
      '&',
      '^',
      '::',
    ],

    symbols: /[=><!~?:&|+\-*/^%]+/,
    escapes: /\\(?:[abfnrtv\\"'0]|x[0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]+\})/,

    tokenizer: {
      root: [
        [/@[a-zA-Z_][a-zA-Z0-9_]*/, 'annotation'],
        [/:[a-zA-Z_][a-zA-Z0-9_]*[?!]?/, 'constant'],
        [/:"/, { token: 'constant', next: '@atomString' }],
        [/\b[A-Z][a-zA-Z0-9_]*\b/, 'type.identifier'],
        [
          /\b[a-z_][a-zA-Z0-9_]*[?!]?\b/,
          { cases: { '@keywords': 'keyword', '@default': 'identifier' } },
        ],
        [/\b0[xX][0-9a-fA-F_]+\b/, 'number.hex'],
        [/\b0[oO][0-7_]+\b/, 'number.octal'],
        [/\b0[bB][01_]+\b/, 'number.binary'],
        [/\b\d[\d_]*\.\d[\d_]*([eE][+-]?\d+)?\b/, 'number.float'],
        [/\b\d[\d_]*\b/, 'number'],
        [/#.*$/, 'comment'],
        [/"""/, { token: 'string', next: '@docString' }],
        [/"/, { token: 'string', next: '@dqString' }],
        [/'/, { token: 'string', next: '@sqString' }],
        [/[()[\]{}]/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
      ],

      atomString: [
        [/[^\\"]+/, 'constant'],
        [/@escapes/, 'constant.escape'],
        [/"/, { token: 'constant', next: '@pop' }],
      ],

      docString: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/"""/, { token: 'string', next: '@pop' }],
        [/"/, 'string'],
      ],

      dqString: [
        [/[^\\"#]+/, 'string'],
        [/#\{/, { token: 'delimiter.bracket', next: '@interpolation' }],
        [/@escapes/, 'string.escape'],
        [/"/, { token: 'string', next: '@pop' }],
      ],

      sqString: [
        [/[^\\'#]+/, 'string'],
        [/#\{/, { token: 'delimiter.bracket', next: '@interpolation' }],
        [/@escapes/, 'string.escape'],
        [/'/, { token: 'string', next: '@pop' }],
      ],

      interpolation: [[/\}/, { token: 'delimiter.bracket', next: '@pop' }], { include: 'root' }],
    },
  })
}

/** Switches syntax highlighting when the player picks another language (ADR 0030). */
export function setEditorLanguage(
  editor: monaco.editor.IStandaloneCodeEditor,
  language: string,
): void {
  const model = editor.getModel()
  if (model !== null) {
    monaco.editor.setModelLanguage(model, language)
  }
}

/**
 * `path` is where the model lives, as a file: a real path is what lets the TypeScript
 * service resolve the project's relative imports (see `addSiblingFile`).
 */
export function createEditor(
  parent: HTMLElement,
  value: string,
  path: string,
): monaco.editor.IStandaloneCodeEditor {
  const model = monaco.editor.createModel(value, 'typescript', monaco.Uri.file(path))
  return monaco.editor.create(parent, {
    model,
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    scrollBeyondLastLine: false,
    tabSize: 2,
  })
}
