import type { Tileset } from './map-description.js'

/**
 * The one flat, seamlessly-tileable swatch picked from each sheet for each kind of ground,
 * found by sampling the sheet's pixels for a cell with no more than a couple of colours,
 * then tiling it 6x6 to check for seams by eye (ADR 0058). Everything else in these
 * tilesets is either a demonstration blob shape or a wall/window panel meant to be placed
 * whole — not a per-cell autotile source.
 */
export const TERRAIN_TILE_INDEX = {
  world: { grass: 0, path: 206 },
  indoor: { floor: 32 },
  city: { concrete: 1096, asphalt: 458 },
} as const satisfies Record<Tileset, Record<string, number>>

/**
 * `image` is relative to where the compiled `.tmj` lives (`content/maps/`), pointing at the
 * real source art — so the checked-in map opens in the actual Tiled app, not just in the
 * game (ADR 0058). The running game never reads this path: it preloads its own copy from
 * `apps/game/public/`, keyed by tileset name, same as every other Phaser texture.
 */
export const TILESET_META: Record<
  Tileset,
  { image: string; imagewidth: number; imageheight: number; columns: number; tilecount: number }
> = {
  world: {
    image: '../../assets/graphics/graphics/tilesets/world.png',
    imagewidth: 640,
    imageheight: 1344,
    columns: 40,
    tilecount: 40 * 84,
  },
  indoor: {
    image: '../../assets/graphics/graphics/tilesets/indoor.png',
    imagewidth: 640,
    imageheight: 576,
    columns: 40,
    tilecount: 40 * 36,
  },
  // Lo-Bit City (Greywyrd — assets/lo-bit-city/LICENCE.txt, credit required), the same
  // pack the campus buildings are stamped from: concrete and asphalt instead of grass, to
  // match a set of buildings that reads as city blocks, not cottages.
  city: {
    image: '../../assets/lo-bit-city/tileset.png',
    imagewidth: 960,
    // The real file is 540px tall (33.75 tiles) — rounded down to the last full row so
    // Phaser's tileset math has no partial row to warn about; the tiles this map actually
    // uses are well within the first 33 rows anyway.
    imageheight: 528,
    columns: 60,
    tilecount: 60 * 33,
  },
}

export const TILE_SIZE = 16
