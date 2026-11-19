import {
  createSave,
  emptyProgress,
  markCutsceneSeen,
  type Progress,
  pendingCutscene,
  type Quest,
  questOfferedBy,
  resumeQuest,
  type Save,
  type SaveCode,
  withQuestCode,
} from '@unifor-quest/core'
import Phaser from 'phaser'
import { deleteSave, loadSave, type SaveWrite, writeSave } from './api.js'
import { campusDoors } from './content/campus-doors.js'
import { filaDoCentroDeConvivenciaQuest } from './content/centro-de-convivencia.js'
import { credits } from './content/credits.js'
import { storyCutscenes, storyQuests, storyStops } from './content/story.js'
import { createBibliotecaScene } from './scenes/biblioteca-scene.js'
import { createCampusScene, RETURN_POSITION_KEY } from './scenes/campus-scene.js'
import { createCentroDeConvivenciaScene } from './scenes/centro-de-convivencia-scene.js'
import { createCreditsScene } from './scenes/credits-scene.js'
import { createEntradaScene } from './scenes/entrada-scene.js'
import type { Conversation, CutsceneHost } from './scenes/interior-scene.js'
import { createMenuScene, type SaveStatus } from './scenes/menu-scene.js'
import { createTecnologiaScene } from './scenes/tecnologia-scene.js'
import { createObjectiveHud } from './ui/objective-hud.js'
import { createQuestPanel, type QuestPanel } from './ui/quest-panel.js'

/**
 * The player's state. It lives here, in memory, and goes to disk on every completed quest
 * (ADR 0020): there is no other moment the game saves.
 */
let progress: Progress = emptyProgress

/** The player's code by quest and by language, as of each quest's last completion (ADR 0072). */
let savedCode: SaveCode = {}

/**
 * The save on disk as this session last knew it: read once at boot, then kept in step with
 * every autosave and every deletion — nothing else writes it (ADR 0072).
 */
let saveOnDisk: { status: SaveStatus; save?: Save } = { status: 'missing' }

const objectiveHud = createObjectiveHud(storyQuests, () => progress)

/**
 * One panel per story quest, created the first time an NPC offers it rather than all at
 * boot — each one carries its own Monaco editor.
 */
const storyPanels = new Map<string, QuestPanel>()

function panelFor(quest: Quest): QuestPanel {
  const existing = storyPanels.get(quest.id)
  if (existing !== undefined) {
    return existing
  }
  const created = createQuestPanel(
    quest,
    () => progress,
    (completion) => {
      progress = completion.progress
      objectiveHud.refresh()
      onProgressChanged()
      void autosave(quest, created)
    },
    savedCode[quest.id],
  )
  document.body.append(created.element)
  storyPanels.set(quest.id, created)
  return created
}

/**
 * Saves after a completed quest, once its `onSuccess` is already in `progress` (ADR 0020).
 * A replay saves too: the world does not change (ADR 0030), but the code in a new language
 * does. Failing quietly would lose progress without the player knowing, so it says so.
 */
async function autosave(quest: Quest, panel: QuestPanel): Promise<void> {
  // Merged, not replaced: a language from the save that was not opened this session is
  // still the player's code (ADR 0030).
  savedCode = withQuestCode(savedCode, quest.id, { ...savedCode[quest.id], ...panel.code() })
  const save = createSave(progress, savedCode)
  const outcome = await writeSave(save)
  if (outcome.ok) {
    saveOnDisk = { status: 'ok', save }
  } else {
    if (outcome.reason === 'newer') {
      saveOnDisk = { status: 'newer' }
    }
    panel.warn(autosaveFailure(outcome))
  }
}

function autosaveFailure(outcome: Exclude<SaveWrite, { ok: true }>): string {
  return outcome.reason === 'newer'
    ? 'O progresso nao foi salvo: o save no disco e de uma versao mais nova do jogo e foi mantido.'
    : 'O progresso nao foi salvo. Verifique o espaco em disco e as permissoes da pasta do jogo.'
}

/**
 * Talking to an NPC opens the quest they offer (ADR 0059): which NPC offers what comes from
 * each quest's own `npc` field, so a new place needs no change here.
 */
function talkToNpc(npcId: string): Conversation | undefined {
  const quest = questOfferedBy(storyQuests, npcId, progress)
  if (quest === undefined) {
    return undefined
  }
  return { offer: quest.dialogue.offer, open: panelFor(quest).open }
}

/**
 * Cutscenes play in the scene they name, once each (ADR 0066): which one is due is a rule
 * of `core`, and having seen it is part of `progress`, like a completed quest.
 */
const cutscenes: CutsceneHost = {
  pending: (sceneKey) => pendingCutscene(storyCutscenes, sceneKey, progress),
  onStart: () => objectiveHud.hide(),
  onEnd: (cutscene) => {
    progress = markCutsceneSeen(progress, cutscene)
    objectiveHud.show()
  },
}

/** Every room hears it; only the one on screen redraws or plays anything. */
function onProgressChanged(): void {
  entrada.progressChanged()
  biblioteca.progressChanged()
}

/** Puts a whole new state in place: progress, code, and every editor already open. */
function resetTo(nextProgress: Progress, nextCode: SaveCode): void {
  progress = nextProgress
  savedCode = nextCode
  for (const [questId, panel] of storyPanels) {
    panel.restore(nextCode[questId])
  }
  objectiveHud.refresh()
  objectiveHud.show()
}

const menu = createMenuScene({
  saveStatus: () => saveOnDisk.status,
  // Back from the pause menu or the credits, the objective HUD would still be up.
  onShow: () => objectiveHud.hide(),
  // A new game starts from nothing, so the opening plays again (ADR 0066). Over a save, the
  // menu has already asked, and the save goes (ADR 0072).
  onStartNewGame: async () => {
    if (saveOnDisk.status === 'ok' && (await deleteSave())) {
      saveOnDisk = { status: 'missing' }
    }
    resetTo(emptyProgress, {})
  },
  // The game picks up inside the building of the next quest (ADR 0077).
  onLoadGame: (scene) => {
    const save = saveOnDisk.save
    if (save === undefined) {
      return 'entrada'
    }
    resetTo(save.progress, save.code)
    const quest = resumeQuest(storyQuests, progress)
    const stop = quest === undefined ? undefined : storyStops[quest.id]
    if (stop?.campusReturn !== undefined) {
      scene.registry.set(RETURN_POSITION_KEY, stop.campusReturn)
    } else {
      scene.registry.remove(RETURN_POSITION_KEY)
    }
    return stop?.scene ?? 'entrada'
  },
})
const campus = createCampusScene({
  doors: campusDoors,
  progress: () => progress,
  restored: () => progress.flags.includes('campus-restaurado'),
  cutscenes,
  // The same Davi as in the opening (content/entrada.ts), back for the epilogue.
  actors: { davi: 'characters/straw.png' },
})
/**
 * A quest's payoff in the world (shelves standing up, the queue lining up, NULL falling)
 * waits until its editor panel is closed, so the player actually sees it happen.
 */
const completionIsVisible = (): boolean =>
  [...storyPanels.values()].every((questPanel) => questPanel.element.hidden)
const biblioteca = createBibliotecaScene({
  onTalkToNpc: talkToNpc,
  cutscenes,
  // The quest's own effect (content/biblioteca.ts): the knocked-over shelves stand back up.
  isOrganized: () => progress.flags.includes('acervo-organizado'),
  canPlayCompletion: completionIsVisible,
})
const centroDeConvivencia = createCentroDeConvivenciaScene({
  onTalkToNpc: talkToNpc,
  isQuestUnlocked: () => progress.completedQuests.includes('arvore-do-acervo'),
  isReopened: () => progress.flags.includes('centro-de-convivencia-reaberto'),
  canPlayCompletion: completionIsVisible,
  successDialogue: filaDoCentroDeConvivenciaQuest.dialogue.success,
})
const tecnologia = createTecnologiaScene({
  onTalkToNpc: talkToNpc,
  cutscenes,
  isDefeated: () => progress.flags.includes('null-derrotado'),
  canPlayCompletion: completionIsVisible,
})
const creditsScene = createCreditsScene(credits, { onStart: () => objectiveHud.hide() })
const entrada = createEntradaScene({
  onTalkToNpc: talkToNpc,
  cutscenes,
  // Passing Marcos, not just standing near him, is the point (ADR 0061): the gate to the
  // rest of the campus stays shut until "Placas embaralhadas" is solved.
  canLeave: () => progress.flags.includes('minimapa-liberado'),
  world: {
    screensDark: () =>
      progress.seenCutscenes.includes('abertura') && !progress.flags.includes('campus-restaurado'),
    signScrambled: () =>
      progress.seenCutscenes.includes('abertura') && !progress.flags.includes('minimapa-liberado'),
  },
})

document.body.append(objectiveHud.element)

/** What the save on disk means for the menu: only a valid one can be loaded (ADR 0072). */
async function readSaveOnDisk(): Promise<void> {
  const read = await loadSave()
  saveOnDisk =
    read.kind === 'ok'
      ? { status: 'ok', save: read.save }
      : { status: read.kind === 'missing' ? 'missing' : read.kind }
}

// The menu needs to know whether there is a game to load before it draws, so the game
// boots once the save has been read — one IPC round trip.
void readSaveOnDisk().finally(startGame)

function startGame(): void {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1d1f2b',
    pixelArt: true,
    // A fixed virtual canvas, scaled up to fill the window (FIT + CENTER_BOTH), not a 1:1
    // match to it (RESIZE): at a real window's resolution, the 16px tiles and small interiors
    // (entrada, biblioteca) rendered as a tiny island in a sea of background. 960x540 is a
    // 16:9 half of 1080p, so a maximized widescreen window scales it by a clean 2x with no
    // letterboxing; `pixelArt: true` already disables smoothing, so that scale-up stays crisp.
    // (A smaller virtual canvas enlarges the world more, but every HUD text's hardcoded pixel
    // offset — the title screen included — was tuned assuming a much taller canvas than that;
    // going too small clips it off the top instead.)
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 540,
    },
    // The menu is the real boot scene now (ADR 0062), one step before the portaria (0061):
    // the player starts at the title screen, not already inside the guardhouse.
    // `centro-de-convivencia` and `bloco-de-tecnologia` are the keys content/campus-doors.ts
    // already points at (ADR 0074): registering them is what makes those doors open.
    scene: [
      menu.config,
      entrada.config,
      campus.config,
      biblioteca.config,
      centroDeConvivencia.config,
      tecnologia.config,
      creditsScene.config,
    ],
  })
}
