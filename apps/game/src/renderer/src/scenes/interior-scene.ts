import type { Cutscene, DialogueLine } from '@unifor-quest/core'
import type Phaser from 'phaser'
import type { Rect } from './player.js'

/**
 * What every room shares (ADR 0059, 0066, 0075). Each room is its own pixel-art scene
 * (Portaria, Biblioteca, Centro de Convivência, Bloco de Tecnologia); this is the vocabulary
 * they have in common with the game: a conversation that opens a quest, the host that plays
 * cutscenes, the id of the player in a cutscene, and the solid furniture the map carries.
 */

export type Conversation = {
  offer: readonly DialogueLine[]
  /** Opens whatever quest panel this conversation is leading to. */
  open: () => void
}

/**
 * What a scene needs from the game to play its cutscenes (ADR 0066). The same for every
 * scene: which cutscene is due comes from `core`, and remembering it was seen is the
 * game's progress, not the scene's.
 */
export type CutsceneHost = {
  pending: (sceneKey: string) => Cutscene | undefined
  onStart: () => void
  onEnd: (cutscene: Cutscene) => void
}

/** The id cutscene steps use for the player's own character. */
export const PLAYER_ACTOR = 'calouro'

export type Furniture = Rect & { id: string; kind: 'rect' | 'ellipse'; color: number }

/**
 * The `shape` objects of the map's object layer (`compileMap` puts them next to the
 * buildings). Tiled properties arrive untyped, so each one is checked before use; an object
 * missing what a shape needs is skipped rather than drawn wrong.
 */
export function readShapes(map: Phaser.Tilemaps.Tilemap): Furniture[] {
  const shapes: Furniture[] = []
  for (const object of map.getObjectLayer('buildings')?.objects ?? []) {
    if (object.type !== 'shape') {
      continue
    }
    const kind = property(object, 'kind')
    const color = property(object, 'color')
    const shapeId = property(object, 'shapeId')
    if ((kind !== 'rect' && kind !== 'ellipse') || typeof color !== 'string') {
      continue
    }
    shapes.push({
      id: typeof shapeId === 'string' ? shapeId : '',
      kind,
      color: Number.parseInt(color.replace('#', ''), 16),
      x: object.x ?? 0,
      y: object.y ?? 0,
      width: object.width ?? 0,
      height: object.height ?? 0,
    })
  }
  return shapes
}

function property(object: Phaser.Types.Tilemaps.TiledObject, name: string): unknown {
  const properties: unknown = object.properties
  if (!Array.isArray(properties)) {
    return undefined
  }
  for (const entry of properties) {
    if (typeof entry === 'object' && entry !== null && 'name' in entry && entry.name === name) {
      return 'value' in entry ? entry.value : undefined
    }
  }
  return undefined
}
