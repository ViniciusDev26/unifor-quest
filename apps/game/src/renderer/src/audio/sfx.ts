import type Phaser from 'phaser'
import { playSfx, preloadAudio } from './music.js'

/**
 * The world's sound effects (GDD §5): Kenney's CC0 packs in assets/audio/sfx. Every scene
 * the player walks in preloads them once; Phaser keeps one audio cache for the whole game.
 */
export const SFX = {
  steps: ['sfx-step-0', 'sfx-step-1'],
  doorOpen: 'sfx-door-open',
  doorClose: 'sfx-door-close',
  /** The Bloco de Tecnologia's doors: sliding, not wooden. */
  techDoorOpen: 'sfx-tech-door-open',
  techDoorClose: 'sfx-tech-door-close',
  bookOpen: 'sfx-book-open',
  bookFlip: 'sfx-book-flip',
  /** NULL's sound motif, under each of its lines: a retro beep, never a voice. */
  nullBeep: 'sfx-null-beep',
  /** NULL coming apart. */
  forceField: 'sfx-force-field',
} as const

const FILES: readonly (readonly [string, string])[] = [
  [SFX.steps[0], 'audio/sfx/rpg/footstep00.ogg'],
  [SFX.steps[1], 'audio/sfx/rpg/footstep01.ogg'],
  [SFX.doorOpen, 'audio/sfx/rpg/doorOpen_1.ogg'],
  [SFX.doorClose, 'audio/sfx/rpg/doorClose_1.ogg'],
  [SFX.techDoorOpen, 'audio/sfx/scifi/doorOpen_000.ogg'],
  [SFX.techDoorClose, 'audio/sfx/scifi/doorClose_000.ogg'],
  [SFX.bookOpen, 'audio/sfx/rpg/bookOpen.ogg'],
  [SFX.bookFlip, 'audio/sfx/rpg/bookFlip1.ogg'],
  [SFX.nullBeep, 'audio/sfx/scifi/laserRetro_000.ogg'],
  [SFX.forceField, 'audio/sfx/scifi/forceField_000.ogg'],
]

export function preloadWorldSfx(scene: Phaser.Scene): void {
  for (const [key, path] of FILES) {
    preloadAudio(scene, key, path)
  }
}

/** Plays `key` if some scene loaded it: a scene that never preloads stays silent, not broken. */
export function playLoadedSfx(scene: Phaser.Scene, key: string, volume = 0.6): void {
  if (scene.cache.audio.exists(key)) {
    playSfx(scene, key, volume)
  }
}

let nextStep = 0

/** One footstep, alternating feet. Quiet: it plays several times a second while walking. */
export function playStep(scene: Phaser.Scene): void {
  const key = SFX.steps[nextStep % SFX.steps.length] ?? SFX.steps[0]
  nextStep += 1
  playLoadedSfx(scene, key, 0.16)
}
