import { type Conversation, createInteriorScene, type InteriorScene } from './interior-scene.js'

/**
 * Interior of the Biblioteca, where Dona Célia offers "A árvore do acervo" (docs/story.md).
 * Reached by walking onto the building on `campus` and pressing E. Her counter, the
 * terminal and the knocked-over shelves come from the map, not from here.
 */
export function createBibliotecaScene(options: {
  onTalkToNpc: (npcId: string) => Conversation | undefined
}): InteriorScene {
  return createInteriorScene({
    key: 'biblioteca',
    music: { key: 'biblioteca-theme', path: 'audio/music/rpgchip07_the_shrine_of_mysteries.ogg' },
    hint: 'Biblioteca. E para falar com a Dona Célia ou sair pela porta. Esc pausa.',
    wallColor: 0x3b2a1a,
    player: { x: 12, y: 8 },
    // Behind the counter: talking to her is across it, from the aisle.
    npcs: [{ id: 'Dona Célia', sprite: 'characters/purple_girl.png', at: { x: 12, y: 3.25 } }],
    door: { at: { x: 12, y: 11 } },
    onTalkToNpc: options.onTalkToNpc,
  })
}
