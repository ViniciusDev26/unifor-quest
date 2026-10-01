import type Phaser from 'phaser'

/**
 * One background track at a time, shared across every scene — Phaser's `scene.sound` is
 * the same global `SoundManager` no matter which scene calls it, so switching scenes
 * never needs to stop/restart the track unless the key actually changes (ADR 0062).
 */
const MUSIC_VOLUME = 0.35

let current: Phaser.Sound.BaseSound | undefined
let currentKey: string | undefined

export function preloadAudio(scene: Phaser.Scene, key: string, path: string): void {
  scene.load.audio(key, path)
}

export function playMusic(scene: Phaser.Scene, key: string): void {
  if (currentKey === key && current?.isPlaying === true) {
    return
  }
  current?.stop()
  current = scene.sound.add(key, { loop: true, volume: MUSIC_VOLUME })
  current.play()
  currentKey = key
}

export function playSfx(scene: Phaser.Scene, key: string, volume = 0.6): void {
  scene.sound.play(key, { volume })
}
