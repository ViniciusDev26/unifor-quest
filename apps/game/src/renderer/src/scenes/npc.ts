import type Phaser from 'phaser'

/**
 * An NPC standing still in a scene: same 4x4 walk-sheet convention as the player
 * (`player.ts`), frame 0 (facing down) held as an idle pose — nothing here needs to move.
 */
const FRAME_SIZE = 128
const NPC_SCALE = 0.25
const TALK_RADIUS = 40

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
  return { sprite, x, y }
}

export function isNearNpc(npc: Npc, playerX: number, playerY: number): boolean {
  return Math.hypot(playerX - npc.x, playerY - npc.y) < TALK_RADIUS
}
