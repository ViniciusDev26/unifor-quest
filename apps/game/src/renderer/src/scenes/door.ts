import type Phaser from 'phaser'

const DOOR_RADIUS = 40

export type Door = {
  x: number
  y: number
}

/**
 * A visible exit marker — the one spot a room's "leave" action is tied to, now that Esc is
 * the pause menu everywhere (ADR 0062) and can't double as "go back to campus" too. Drawn
 * as a plain rectangle; real door art is future work (ADR 0058's building-sprite pass only
 * covers exteriors so far).
 */
export function createDoor(scene: Phaser.Scene, x: number, y: number, label = 'Saida'): Door {
  const size = 24
  // A mark on the floor, not a sign floating in front of it: depth 0, same tier as the
  // ground itself, below the player and the NPC (`player.ts`, `npc.ts` both sit at depth 1)
  // — walking onto it reads as standing on the tile, not as the tile sitting on top of the
  // character.
  scene.add.rectangle(x, y, size, size, 0x7aa2ff, 0.85).setStrokeStyle(2, 0xe8e8f0).setDepth(0)
  scene.add
    .text(x, y - size, label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#e8e8f0',
      backgroundColor: '#1d1f2bcc',
      padding: { x: 3, y: 1 },
    })
    .setOrigin(0.5, 1)
    .setDepth(0)
  return { x, y }
}

export function isNearDoor(door: Door, playerX: number, playerY: number): boolean {
  return Math.hypot(playerX - door.x, playerY - door.y) < DOOR_RADIUS
}
