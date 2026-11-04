import {
  emptyProgress,
  markCutsceneSeen,
  type Progress,
  pendingCutscene,
  type Quest,
  questOfferedBy,
} from '@unifor-quest/core'
import Phaser from 'phaser'
import { storyCutscenes, storyQuests } from './content/story.js'
import { createBibliotecaScene } from './scenes/biblioteca-scene.js'
import { createCampusScene } from './scenes/campus-scene.js'
import { createEntradaScene } from './scenes/entrada-scene.js'
import type { Conversation, CutsceneHost } from './scenes/interior-scene.js'
import { createMenuScene } from './scenes/menu-scene.js'
import { createObjectiveHud } from './ui/objective-hud.js'
import { createQuestPanel, type QuestPanel } from './ui/quest-panel.js'

/**
 * The player's state. Keeping it in memory is Phase A: persisting it is Phase B
 * (ADR 0020, ADR 0029).
 */
let progress: Progress = emptyProgress

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
    },
  )
  document.body.append(created.element)
  storyPanels.set(quest.id, created)
  return created
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

const menu = createMenuScene({
  // A new game starts from nothing, so the opening plays again (ADR 0066).
  onStartNewGame: () => {
    progress = emptyProgress
    objectiveHud.refresh()
    objectiveHud.show()
  },
})
const campus = createCampusScene()
const biblioteca = createBibliotecaScene({ onTalkToNpc: talkToNpc, cutscenes })
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
  scene: [menu.config, entrada.config, campus.config, biblioteca.config],
})
