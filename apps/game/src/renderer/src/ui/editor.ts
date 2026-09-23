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

export function createEditor(
  parent: HTMLElement,
  value: string,
): monaco.editor.IStandaloneCodeEditor {
  return monaco.editor.create(parent, {
    value,
    language: 'typescript',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    scrollBeyondLastLine: false,
    tabSize: 2,
  })
}
