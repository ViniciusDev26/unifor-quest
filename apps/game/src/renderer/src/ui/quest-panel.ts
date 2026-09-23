import {
  type Completion,
  completeQuest,
  evaluateSubmission,
  formatTypeSpec,
  type LanguageId,
  languagesFor,
  type Progress,
  type Quest,
} from '@unifor-quest/core'
import { runCode, stubFor } from '../api.js'
import { createEditor, setEditorLanguage } from './editor.js'
import './quest-panel.css'

/** Languages with an adapter today. The rest are shown, but not offered yet (ADR 0030). */
const IMPLEMENTED: readonly LanguageId[] = ['typescript', 'go']

export type QuestPanel = {
  element: HTMLElement
  open: () => void
}

export function createQuestPanel(
  quest: Quest,
  getProgress: () => Progress,
  onCompleted: (completion: Completion) => void,
): QuestPanel {
  const root = document.createElement('section')
  root.className = 'quest'
  root.hidden = true
  root.innerHTML = `
    <aside class="quest__side">
      <h1 class="quest__title"></h1>
      <p class="quest__npc"></p>
      <div class="quest__dialogue"></div>
      <pre class="quest__signature"></pre>
    </aside>
    <div class="quest__main">
      <div class="quest__bar">
        <label>Linguagem <select class="quest__language"></select></label>
        <button type="button" class="quest__run">Executar</button>
        <button type="button" class="quest__close">Fechar</button>
      </div>
      <div class="quest__editor"></div>
      <div class="quest__results">Escreva sua solucao e clique em Executar.</div>
    </div>
  `

  const title = query<HTMLHeadingElement>(root, '.quest__title')
  const npc = query<HTMLParagraphElement>(root, '.quest__npc')
  const dialogue = query<HTMLDivElement>(root, '.quest__dialogue')
  const signature = query<HTMLPreElement>(root, '.quest__signature')
  const languageSelect = query<HTMLSelectElement>(root, '.quest__language')
  const runButton = query<HTMLButtonElement>(root, '.quest__run')
  const closeButton = query<HTMLButtonElement>(root, '.quest__close')
  const editorHost = query<HTMLDivElement>(root, '.quest__editor')
  const results = query<HTMLDivElement>(root, '.quest__results')

  title.textContent = quest.title
  npc.textContent = quest.npc
  dialogue.innerHTML = quest.dialogue.offer
    .map((line) => `<p class="quest__line">${escapeHtml(line.text)}</p>`)
    .join('')

  const args = quest.challenge.parameters
    .map((parameter) => `${parameter.name}: ${formatTypeSpec(parameter.type)}`)
    .join(', ')
  signature.textContent = `${quest.challenge.functionName}(${args}) -> ${formatTypeSpec(quest.challenge.returns)}`

  for (const id of languagesFor(quest.challenge)) {
    const option = document.createElement('option')
    option.value = id
    const implemented = IMPLEMENTED.includes(id)
    option.textContent = implemented ? id : `${id} (em breve)`
    option.disabled = !implemented
    languageSelect.append(option)
  }

  const editor = createEditor(editorHost, '')

  // One buffer per language: the player's TypeScript attempt is not Go, and switching must
  // not throw either of them away. This is the same split the save uses (ADR 0030).
  const written = new Map<LanguageId, string>()
  let current: LanguageId = languageSelect.value as LanguageId

  /** Brings up the code for a language: what the player wrote, or the adapter's stub. */
  const show = async (language: LanguageId): Promise<void> => {
    const remembered = written.get(language)
    editor.setValue(remembered ?? (await stubFor(quest.challenge, language)))
    setEditorLanguage(editor, language)
    current = language
  }

  languageSelect.addEventListener('change', () => {
    written.set(current, editor.getValue())
    void show(languageSelect.value as LanguageId)
  })

  closeButton.addEventListener('click', () => {
    root.hidden = true
  })

  runButton.addEventListener('click', async () => {
    runButton.disabled = true
    results.textContent = 'Executando...'

    const envelope = await runCode({
      challenge: quest.challenge,
      language: languageSelect.value as LanguageId,
      playerCode: editor.getValue(),
    })
    const submission = evaluateSubmission(quest.challenge, envelope)

    renderResults(results, submission, envelope.playerStdout)

    if (submission.solved) {
      const completion = completeQuest(getProgress(), quest)
      renderSuccess(results, quest, completion)
      onCompleted(completion)
    }

    runButton.disabled = false
  })

  return {
    element: root,
    open: () => {
      root.hidden = false
      const language = languageSelect.value as LanguageId
      if (written.has(language) || editor.getValue().trim() !== '') {
        editor.focus()
        return
      }
      void show(language).then(() => {
        editor.focus()
      })
    },
  }
}

function renderResults(
  target: HTMLElement,
  submission: ReturnType<typeof evaluateSubmission>,
  playerStdout: string,
): void {
  const lines = submission.outcomes.map((outcome) => {
    const mark = outcome.passed ? '&check;' : '&times;'
    const css = outcome.passed ? 'quest__case--ok' : 'quest__case--fail'
    const head = `<div class="${css}">${mark} ${escapeHtml(outcome.name)}</div>`

    if (outcome.passed) {
      return head
    }
    if (outcome.missing) {
      return `${head}<div class="quest__detail">nao chegou a rodar</div>`
    }
    return `${head}<div class="quest__detail">esperado ${escapeHtml(
      JSON.stringify(outcome.expected),
    )}, veio ${escapeHtml(JSON.stringify(outcome.actual))}</div>`
  })

  const passed = submission.outcomes.filter((outcome) => outcome.passed).length
  lines.push(
    `<div class="quest__summary">${passed}/${submission.outcomes.length} testes passaram &middot; ${submission.totalOps} operacoes</div>`,
  )

  if (submission.error !== null) {
    lines.push(`<div class="quest__error">${escapeHtml(submission.error)}</div>`)
  }
  if (playerStdout !== '') {
    lines.push(`<div class="quest__detail">saida do seu codigo:\n${escapeHtml(playerStdout)}</div>`)
  }

  target.innerHTML = lines.join('')
}

function renderSuccess(target: HTMLElement, quest: Quest, completion: Completion): void {
  const parts = quest.dialogue.success.map(
    (line) => `<div class="quest__success">${escapeHtml(line.text)}</div>`,
  )

  if (!completion.completedNow) {
    parts.push('<div class="quest__summary">Voce ja tinha concluido esta quest.</div>')
  }
  for (const effect of completion.effects) {
    parts.push(`<div class="quest__summary">efeito aplicado: ${escapeHtml(effect.flag)}</div>`)
  }

  target.insertAdjacentHTML('beforeend', parts.join(''))
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector)
  if (found === null) {
    throw new Error(`missing element: ${selector}`)
  }
  return found
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  )
}
