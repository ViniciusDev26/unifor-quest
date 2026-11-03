import type Phaser from 'phaser'
import { playSfx, preloadAudio } from '../audio/music.js'
import {
  type Conversation,
  type CutsceneHost,
  createInteriorScene,
  type InteriorScene,
  type RoomDecor,
} from './interior-scene.js'
import type { Rect } from './player.js'

const GLITCH_SFX = 'portaria-glitch'
const NOISE_SFX = 'portaria-noise'
const NULL_GREEN = '#3ddc84'

/** The panel's sign, readable and after Davi's reset: the first example of the cipher quest. */
const SIGN = 'Campus'
const SCRAMBLED_SIGN = 'Fdpsxv'

/** What the portaria shows depends on the world, not on the room (ADR 0070). */
export type PortariaWorld = {
  /** The wall screens show NULL: after the opening, until the campus is restored. */
  screensDark: () => boolean
  /** The sign panel is gibberish: after Davi's reset, until the cipher is solved. */
  signScrambled: () => boolean
}

/**
 * The entrance guardhouse — Marcos's booth, not the outdoor gate itself (ADR 0059). Reached
 * by walking up to the gates on `campus` and pressing E, same as entering the Biblioteca.
 *
 * This is also where the game boots (0061): the player starts inside the guardhouse, and
 * `canLeave` — true once "Placas embaralhadas" sets `minimapa-liberado` — is what turns the
 * door from a no-op into the way out to the rest of the campus. Passing Marcos is the
 * point, not an afterthought.
 *
 * The opening cutscene plays here (ADR 0066): Davi is its actor, and the screens and the
 * sign panel are what its cues act on.
 */
export function createEntradaScene(options: {
  onTalkToNpc: (npcId: string) => Conversation | undefined
  canLeave: () => boolean
  cutscenes: CutsceneHost
  world: PortariaWorld
}): InteriorScene {
  return createInteriorScene({
    key: 'entrada',
    // Reaproveita o tema calmo do campus (ADR 0062) -- a portaria ainda nao tem trilha
    // propria no GDD, e os dois lugares compartilham o mesmo tom "antes de tudo mudar".
    music: { key: 'campus-theme', path: 'audio/music/rpgchip03_town.ogg' },
    hint: 'Portaria. E para falar com o Marcos ou sair pela porta. Esc pausa.',
    // At the door: the player has just walked in from the street.
    player: { x: 8, y: 9 },
    npcs: [{ id: 'Marcos', sprite: 'characters/young_guy.png', at: { x: 8, y: 4.5 } }],
    door: {
      at: { x: 8, y: 10 },
      canLeave: options.canLeave,
      locked: [{ speaker: 'Marcos', text: 'Ainda não. Resolve a cifra das placas primeiro.' }],
    },
    onTalkToNpc: options.onTalkToNpc,
    cutscenes: options.cutscenes,
    // A placeholder sheet until the characters get their own art (#29).
    actors: { davi: 'characters/straw.png' },
    decor: portariaDecor(options.world),
  })
}

function portariaDecor(world: PortariaWorld): RoomDecor {
  return {
    preload(scene) {
      preloadAudio(scene, GLITCH_SFX, 'audio/sfx/interface/glitch_001.ogg')
      preloadAudio(scene, NOISE_SFX, 'audio/sfx/scifi/computerNoise_000.ogg')
    },

    create(scene, room) {
      const screens = ['tela-1', 'tela-2']
        .map((id) => room.shape(id))
        .filter((shape): shape is Rect => shape !== undefined)
        .map((shape) => darkScreen(scene, shape))

      const panel = room.shape('painel')
      const sign =
        panel === undefined
          ? undefined
          : scene.add
              .text(panel.x + panel.width / 2, panel.y + panel.height / 2, SIGN, {
                fontFamily: 'monospace',
                fontSize: '9px',
                color: '#facc15',
              })
              .setOrigin(0.5)
              .setResolution(4)

      const setScreensDark = (dark: boolean): void => {
        for (const screen of screens) {
          screen.setVisible(dark)
        }
      }

      const refresh = (): void => {
        setScreensDark(world.screensDark())
        sign?.setText(world.signScrambled() ? SCRAMBLED_SIGN : SIGN)
      }
      refresh()

      return {
        refresh,
        cues: {
          // The screens flicker and settle on NULL.
          'telas-null': (_scene, done) => {
            playSfx(scene, GLITCH_SFX)
            let flicks = 0
            scene.time.addEvent({
              delay: 120,
              repeat: 6,
              callback: () => {
                flicks += 1
                setScreensDark(flicks % 2 === 1)
                if (flicks === 7) {
                  setScreensDark(true)
                  done()
                }
              },
            })
          },

          // Davi's reset: the sign cycles through noise and lands scrambled.
          'painel-reinicia': (_scene, done) => {
            playSfx(scene, NOISE_SFX, 0.4)
            let ticks = 0
            scene.time.addEvent({
              delay: 90,
              repeat: 9,
              callback: () => {
                ticks += 1
                if (ticks === 10) {
                  sign?.setText(SCRAMBLED_SIGN)
                  done()
                  return
                }
                sign?.setText(noise(SIGN.length))
              },
            })
          },
        },
      }
    },
  }
}

/** A screen gone dark with NULL on it, laid over the lit screen the map draws. */
function darkScreen(scene: Phaser.Scene, shape: Rect): Phaser.GameObjects.Container {
  const background = scene.add.rectangle(0, 0, shape.width, shape.height, 0x05080a)
  const label = scene.add
    .text(0, 0, 'NULL', { fontFamily: 'monospace', fontSize: '9px', color: NULL_GREEN })
    .setOrigin(0.5)
    .setResolution(4)
  return scene.add
    .container(shape.x + shape.width / 2, shape.y + shape.height / 2, [background, label])
    .setVisible(false)
}

function noise(length: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@'
  return Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
}
