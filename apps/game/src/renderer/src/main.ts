import { emptyProgress, isQuestAvailable, type Progress, type Quest } from '@unifor-quest/core'
import Phaser from 'phaser'
import { catracaTravadaQuest, placasEmbaralhadasQuest } from './content/fase-1.js'
import { helloWorldQuest } from './content/hello-world.js'
import { createBibliotecaScene } from './scenes/biblioteca-scene.js'
import { createCampusScene } from './scenes/campus-scene.js'
import { type Conversation, createEntradaScene } from './scenes/entrada-scene.js'
import { createMenuScene } from './scenes/menu-scene.js'
import { createWorldScene } from './scenes/world-scene.js'
import { createQuestPanel, type QuestPanel } from './ui/quest-panel.js'

/**
 * The player's state. Keeping it in memory is Phase A: persisting it is Phase B
 * (ADR 0020, ADR 0029).
 */
let progress: Progress = emptyProgress

const panel = createQuestPanel(
  helloWorldQuest,
  () => progress,
  (completion) => {
    progress = completion.progress
    scene.showCompleted(progress.flags)
  },
)

const scene = createWorldScene({
  onTalk: () => {
    if (isQuestAvailable(helloWorldQuest, progress)) {
      panel.open()
    }
  },
})

/**
 * One NPC, several quests: Marcos, the turnstile guard, offers Fase 1's two quests in order
 * ("Placas embaralhadas" unlocks "Catraca travada", ADR 0034's `requires`). Talking to him
 * opens whichever is the furthest-along available one — the next thing to do, or the
 * latest to replay once both are done (ADR 0030).
 */
const marcosQuests: { quest: Quest; panel: QuestPanel }[] = [
  placasEmbaralhadasQuest,
  catracaTravadaQuest,
].map((quest) => ({
  quest,
  panel: createQuestPanel(
    quest,
    () => progress,
    (completion) => {
      progress = completion.progress
    },
  ),
}))

function talkToNpc(npcId: string): Conversation | undefined {
  if (npcId !== 'marcos') {
    return undefined
  }
  const next = [...marcosQuests].reverse().find(({ quest }) => isQuestAvailable(quest, progress))
  if (next === undefined) {
    return undefined
  }
  return { offer: next.quest.dialogue.offer, open: next.panel.open }
}

const menu = createMenuScene()
const campus = createCampusScene()
const biblioteca = createBibliotecaScene()
const entrada = createEntradaScene({
  onTalkToNpc: talkToNpc,
  // Passing Marcos, not just standing near him, is the point (ADR 0061): the gate to the
  // rest of the campus stays shut until "Placas embaralhadas" is solved.
  canLeave: () => progress.flags.includes('minimapa-liberado'),
})

document.body.append(panel.element)
for (const { panel: questPanel } of marcosQuests) {
  document.body.append(questPanel.element)
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1f2b',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // The menu is the real boot scene now (ADR 0062), one step before the portaria (0061):
  // the player starts at the title screen, not already inside the guardhouse. `world`
  // stays registered only as the Phase A hello-world proof, reachable with M from the
  // campus map.
  scene: [menu.config, entrada.config, campus.config, biblioteca.config, scene.config],
})
