import type Phaser from 'phaser'
import type { Rect } from './player.js'

/**
 * An NPC standing still in a scene: same 4x4 walk-sheet convention as the player
 * (`player.ts`), frame 0 (facing down) held as an idle pose — nothing here needs to move.
 */
const FRAME_SIZE = 128
const NPC_SCALE = 0.25
const TALK_RADIUS = 40
const BODY_RADIUS = 12

export type Npc = {
  sprite: Phaser.GameObjects.Sprite
  x: number
  y: number
}

export function preloadNpcSprite(scene: Phaser.Scene, key: string, path: string): void {
  scene.load.spritesheet(key, path, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE })
}

export function createNpc(scene: Phaser.Scene, key: string, x: number, y: number): Npc {
  const sprite = scene.add.sprite(x, y, key, 0)
  sprite.setScale(NPC_SCALE)
  // Same tier as the player (`player.ts`): above floor-level decoration regardless of add
  // order.
  sprite.setDepth(1)
  return { sprite, x, y }
}

export function isNearNpc(npc: Npc, playerX: number, playerY: number): boolean {
  return Math.hypot(playerX - npc.x, playerY - npc.y) < TALK_RADIUS
}

/** A small body-sized box to block the player's feet — talking is a wider radius than that. */
export function npcBox(npc: Npc): Rect {
  return {
    x: npc.x - BODY_RADIUS,
    y: npc.y - BODY_RADIUS,
    width: BODY_RADIUS * 2,
    height: BODY_RADIUS * 2,
  }
}
