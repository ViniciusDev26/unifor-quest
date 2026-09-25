import { emptyProgress, isQuestAvailable, type Progress } from '@unifor-quest/core'
import Phaser from 'phaser'
import { helloWorldQuest } from './content/hello-world.js'
import { createBibliotecaScene } from './scenes/biblioteca-scene.js'
import { createCampusScene } from './scenes/campus-scene.js'
import { createWorldScene } from './scenes/world-scene.js'
import { createQuestPanel } from './ui/quest-panel.js'

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

const campus = createCampusScene()
const biblioteca = createBibliotecaScene()

document.body.append(panel.element)

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1f2b',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [scene.config, campus.config, biblioteca.config],
})
