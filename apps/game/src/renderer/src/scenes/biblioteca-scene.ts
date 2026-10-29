import { type Conversation, createInteriorScene, type InteriorScene } from './interior-scene.js'

/**
 * Interior of the Biblioteca: the proof that the same map pipeline draws from `indoor.png`
 * too (ADR 0058). Reached by walking onto the building on `campus` and pressing E.
 */
export function createBibliotecaScene(options: {
  onTalkToNpc: (npcId: string) => Conversation | undefined
}): InteriorScene {
  return createInteriorScene({
    key: 'biblioteca',
    music: { key: 'biblioteca-theme', path: 'audio/music/rpgchip07_the_shrine_of_mysteries.ogg' },
    hint: 'Biblioteca. E perto da porta para sair. Esc pausa.',
    player: { x: 12, y: 8 },
    npcs: [],
    door: { at: { x: 12, y: 11 } },
    onTalkToNpc: options.onTalkToNpc,
  })
}
