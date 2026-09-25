import type { Graph } from '@unifor-quest/core'

/** The one tileset a scene draws its ground from, each a single embeddable image. */
export type Tileset = 'world' | 'indoor'

/**
 * A ground tile, picked once per tileset from a real, hand-verified flat swatch of the
 * sheet (ADR 0058): no autotile blob, no seams to get wrong. `empty` renders nothing.
 */
export type TerrainKind = 'empty' | 'grass' | 'path' | 'floor'

/** A stamp from `assets/graphics/graphics/objects/`, placed whole, never tiled. */
export type Building = {
  /** The object's own id: a stable slug, e.g. `biblioteca`. */
  id: string
  /** What the player reads. */
  label: string
  asset: string
  /** Top-left corner, in pixels. */
  x: number
  y: number
  width: number
  height: number
}

/**
 * Scenery with no source image, like the lagoa: no asset in `assets/` fits it, so it draws
 * as a plain filled shape instead of a stamp.
 */
export type Shape = {
  id: string
  label: string
  kind: 'ellipse' | 'rect'
  /** CSS-style hex color, e.g. `#3b82c4`. */
  color: string
  x: number
  y: number
  width: number
  height: number
}

export type MapDescription = {
  id: string
  tileset: Tileset
  /** Size in tiles; each tile is 16x16px. */
  width: number
  height: number
  /**
   * One row per string, one character per tile: `.` grass/floor, `#` path, ` ` empty.
   * Every row must be exactly `width` characters (`compileMap` rejects anything else).
   */
  terrain: readonly string[]
  buildings: readonly Building[]
  shapes?: readonly Shape[]
  /** Only the campus map carries the graph (ADR 0012); an interior has none. */
  graph?: Graph
}
