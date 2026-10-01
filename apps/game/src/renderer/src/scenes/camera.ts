import type Phaser from 'phaser'

/**
 * Frames a map inside the camera's own viewport, not the other way around. A room smaller
 * than the window (every interior so far, against a maximized Electron window) has nowhere
 * to scroll to: following the player just pins the camera at a bounds-clamped corner,
 * leaving most of the screen as empty clear-color. Centering a map that small, instead of
 * following, is what makes it look framed rather than stuck in the corner. A map bigger
 * than the viewport (the campus) still follows, same as before.
 *
 * Re-applied on every Phaser resize, since whether a map "fits" depends on the window size,
 * which in Electron keeps changing right after boot (the window starts at its configured
 * size and is maximized a beat later).
 */
export function frameRoom(
  scene: Phaser.Scene,
  mapWidth: number,
  mapHeight: number,
  player: Phaser.GameObjects.Sprite,
): void {
  const camera = scene.cameras.main

  const fit = (): void => {
    if (mapWidth <= camera.width && mapHeight <= camera.height) {
      // Bounds smaller than the viewport clamp every scroll request back to (0, 0) — Phaser
      // has nowhere valid to center a camera bigger than what it's bounded to. Drop the
      // bounds instead of shrinking them to the map's size.
      camera.removeBounds()
      camera.stopFollow()
      camera.centerOn(mapWidth / 2, mapHeight / 2)
    } else {
      camera.setBounds(0, 0, mapWidth, mapHeight)
      camera.startFollow(player)
    }
  }

  fit()
  scene.scale.on('resize', fit)
}
