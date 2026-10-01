import Phaser from 'phaser'

/**
 * `characters/player.png`: a 4x4 sheet, 128px frames — one row per facing direction (down,
 * left, right, up, in that order), four walk-cycle frames each. Shared by every scene that
 * draws the player, so the animation keys are only ever defined once per game instance.
 */
const FRAME_SIZE = 128
const ROWS = { down: 0, left: 1, right: 2, up: 3 } as const

type Direction = keyof typeof ROWS

export const PLAYER_SCALE = 0.25
export const PLAYER_SPRITE_SIZE = FRAME_SIZE * PLAYER_SCALE

export type Rect = { x: number; y: number; width: number; height: number }

/**
 * A box the size of the character's feet, not the whole sprite: the hat and shoulders can
 * overlap the top of a building's image (its roof, drawn behind), while the ground
 * underneath the player still blocks. Centred under the sprite's own origin.
 */
const FEET_WIDTH = 14
const FEET_HEIGHT = 8
const FEET_OFFSET_Y = PLAYER_SPRITE_SIZE / 2 - FEET_HEIGHT / 2

export function feetBoxAt(x: number, y: number): Rect {
  return { x: x - FEET_WIDTH / 2, y: y + FEET_OFFSET_Y, width: FEET_WIDTH, height: FEET_HEIGHT }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/**
 * Keeps the player's feet inside `[margin, dimension - margin]` — the room itself never had
 * a real wall, just a decorative rectangle (`biblioteca-scene.ts`, `entrada-scene.ts`); with
 * no collision, nothing stopped the player from walking straight through it into the void
 * past the camera's bounds. `margin` is the wall's own half-thickness where one is drawn, or
 * 0 for an open map like the campus.
 */
export function clampToRoom(
  sprite: Phaser.GameObjects.Sprite,
  width: number,
  height: number,
  margin: number,
): void {
  const minX = margin + FEET_WIDTH / 2
  const maxX = width - margin - FEET_WIDTH / 2
  const minY = margin - FEET_OFFSET_Y
  const maxY = height - margin - FEET_OFFSET_Y - FEET_HEIGHT

  sprite.x = Phaser.Math.Clamp(sprite.x, minX, maxX)
  sprite.y = Phaser.Math.Clamp(sprite.y, minY, maxY)
}

export function preloadPlayer(scene: Phaser.Scene): void {
  scene.load.spritesheet('player', 'characters/player.png', {
    frameWidth: FRAME_SIZE,
    frameHeight: FRAME_SIZE,
  })
}

function walkKey(direction: Direction): string {
  return `player-walk-${direction}`
}

/** Idempotent: scenes come and go, but the animation manager is shared by the whole game. */
export function ensurePlayerAnimations(scene: Phaser.Scene): void {
  for (const [direction, row] of Object.entries(ROWS) as [Direction, number][]) {
    const key = walkKey(direction)
    if (scene.anims.exists(key)) {
      continue
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers('player', {
        start: row * 4,
        end: row * 4 + 3,
      }),
      frameRate: 8,
      repeat: -1,
    })
  }
}

export function createPlayer(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(x, y, 'player', ROWS.down * 4)
  sprite.setScale(PLAYER_SCALE)
  // Above floor-level decoration (`door.ts`'s depth 0) regardless of add order, so standing
  // on a marker reads as standing on top of it, not being covered by it.
  sprite.setDepth(1)
  return sprite
}

/**
 * Moves the player from input each frame and switches the walk animation to match, standing
 * still on the first frame of the last direction faced when there is no input.
 */
export function movePlayer(
  sprite: Phaser.GameObjects.Sprite,
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  speed: number,
  deltaSeconds: number,
): void {
  let vx = 0
  let vy = 0
  if (cursors.left.isDown) vx -= 1
  if (cursors.right.isDown) vx += 1
  if (cursors.up.isDown) vy -= 1
  if (cursors.down.isDown) vy += 1

  if (vx === 0 && vy === 0) {
    sprite.anims.stop()
    return
  }

  const length = Math.hypot(vx, vy)
  sprite.x += (vx / length) * speed * deltaSeconds
  sprite.y += (vy / length) * speed * deltaSeconds

  const direction: Direction = vx < 0 ? 'left' : vx > 0 ? 'right' : vy < 0 ? 'up' : 'down'
  sprite.anims.play(walkKey(direction), true)
}
