import { type Conversation, createInteriorScene, type InteriorScene } from './interior-scene.js'

/**
 * The entrance guardhouse — Marcos's booth, not the outdoor gate itself (ADR 0059). Reached
 * by walking up to the gates on `campus` and pressing E, same as entering the Biblioteca.
 *
 * This is also where the game boots (0061): the player starts inside the guardhouse, and
 * `canLeave` — true once "Placas embaralhadas" sets `minimapa-liberado` — is what turns the
 * door from a no-op into the way out to the rest of the campus. Passing Marcos is the
 * point, not an afterthought.
 */
export function createEntradaScene(options: {
  onTalkToNpc: (npcId: string) => Conversation | undefined
  canLeave: () => boolean
}): InteriorScene {
  return createInteriorScene({
    key: 'entrada',
    // Reaproveita o tema calmo do campus (ADR 0062) -- a portaria ainda nao tem trilha
    // propria no GDD, e os dois lugares compartilham o mesmo tom "antes de tudo mudar".
    music: { key: 'campus-theme', path: 'audio/music/rpgchip03_town.ogg' },
    hint: 'Portaria. E para falar com o Marcos ou sair pela porta. Esc pausa.',
    player: { x: 8, y: 8 },
    npcs: [{ id: 'Marcos', sprite: 'characters/young_guy.png', at: { x: 8, y: 4.5 } }],
    door: {
      at: { x: 8, y: 10 },
      canLeave: options.canLeave,
      locked: [{ speaker: 'Marcos', text: 'Ainda não. Resolve a cifra das placas primeiro.' }],
    },
    onTalkToNpc: options.onTalkToNpc,
  })
}
