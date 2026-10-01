/**
 * A one-shot sound effect from plain DOM code — for UI that lives beside the Phaser
 * canvas, not inside a scene (the quest panel is an HTML overlay, not a scene object), so
 * it can't reach `scene.sound`. A plain `Audio` element is the whole mechanism needed for
 * a single clip with no loop and no shared state.
 */
export function playClip(path: string, volume = 0.6): void {
  const audio = new Audio(path)
  audio.volume = volume
  void audio.play().catch(() => {})
}
