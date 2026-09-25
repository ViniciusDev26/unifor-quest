import type { Building, MapDescription, Shape, Tileset } from './map-description.js'
import type { TiledMap, TiledObject, TiledObjectLayer, TiledTileLayer } from './tiled-json.js'
import { TERRAIN_TILE_INDEX, TILE_SIZE, TILESET_META } from './tilesets.js'

/** Which ground kind each character in a `terrain` row stands for, per tileset. */
const CHARS: Record<Tileset, { primary: string; secondary?: string }> = {
  world: { primary: 'grass', secondary: 'path' },
  indoor: { primary: 'floor' },
}

function validateTerrain(description: MapDescription): void {
  if (description.terrain.length !== description.height) {
    throw new Error(
      `${description.id}: terrain has ${description.terrain.length} rows, expected ${description.height}`,
    )
  }
  for (const [rowIndex, row] of description.terrain.entries()) {
    if (row.length !== description.width) {
      throw new Error(
        `${description.id}: terrain row ${rowIndex} has ${row.length} columns, expected ${description.width}`,
      )
    }
    for (const char of row) {
      if (char !== '.' && char !== '#' && char !== ' ') {
        throw new Error(`${description.id}: unknown terrain character ${JSON.stringify(char)}`)
      }
    }
  }
}

function groundData(description: MapDescription): number[] {
  const chars = CHARS[description.tileset]
  const index = TERRAIN_TILE_INDEX[description.tileset] as Record<string, number>
  const firstgid = 1

  const data: number[] = []
  for (const row of description.terrain) {
    for (const char of row) {
      if (char === ' ') {
        data.push(0)
        continue
      }
      const kind = char === '#' ? (chars.secondary ?? chars.primary) : chars.primary
      const tileIndex = index[kind]
      if (tileIndex === undefined) {
        throw new Error(`${description.id}: tileset ${description.tileset} has no "${kind}" ground`)
      }
      data.push(firstgid + tileIndex)
    }
  }
  return data
}

function buildingObject(building: Building, nextId: () => number): TiledObject {
  return {
    id: nextId(),
    name: building.label,
    type: 'building',
    x: building.x,
    y: building.y,
    width: building.width,
    height: building.height,
    rotation: 0,
    visible: true,
    properties: [
      { name: 'asset', type: 'string', value: building.asset },
      { name: 'buildingId', type: 'string', value: building.id },
    ],
  }
}

function shapeObject(shape: Shape, nextId: () => number): TiledObject {
  return {
    id: nextId(),
    name: shape.label,
    type: 'shape',
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rotation: 0,
    visible: true,
    properties: [
      { name: 'kind', type: 'string', value: shape.kind },
      { name: 'color', type: 'string', value: shape.color },
    ],
  }
}

/**
 * Turns a hand-written description into a real, complete Tiled map — embedded tileset,
 * ground as a plain tile layer, buildings and the campus graph as object layers with no
 * `gid` (ADR 0058: a building is a whole-image stamp, not a tile, and Phaser's Tiled parser
 * does not support "Collection of Images" tilesets anyway).
 */
export function compileMap(description: MapDescription): TiledMap {
  validateTerrain(description)

  let objectId = 1
  const nextObjectId = () => objectId++

  const meta = TILESET_META[description.tileset]

  const ground: TiledTileLayer = {
    id: 1,
    name: 'ground',
    type: 'tilelayer',
    width: description.width,
    height: description.height,
    x: 0,
    y: 0,
    opacity: 1,
    visible: true,
    data: groundData(description),
  }

  const buildings: TiledObjectLayer = {
    id: 2,
    name: 'buildings',
    type: 'objectgroup',
    draworder: 'topdown',
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
    objects: [
      ...description.buildings.map((building) => buildingObject(building, nextObjectId)),
      ...(description.shapes ?? []).map((shape) => shapeObject(shape, nextObjectId)),
    ],
  }

  const layers: TiledMap['layers'] = [ground, buildings]
  let layerId = 3

  if (description.graph !== undefined) {
    const objects: TiledObject[] = []

    for (const node of description.graph.nodes) {
      objects.push({
        id: nextObjectId(),
        name: node.label,
        type: 'node',
        x: node.x ?? 0,
        y: node.y ?? 0,
        width: 0,
        height: 0,
        rotation: 0,
        visible: true,
        point: true,
        properties: [{ name: 'nodeId', type: 'string', value: node.id }],
      })
    }

    for (const edge of description.graph.edges) {
      objects.push({
        id: nextObjectId(),
        name: `${edge.from}-${edge.to}`,
        type: 'edge',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        visible: true,
        point: true,
        properties: [
          { name: 'from', type: 'string', value: edge.from },
          { name: 'to', type: 'string', value: edge.to },
          { name: 'weight', type: 'float', value: edge.weight },
        ],
      })
    }

    layers.push({
      id: layerId++,
      name: 'graph',
      type: 'objectgroup',
      draworder: 'topdown',
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects,
    })
  }

  return {
    compressionlevel: -1,
    width: description.width,
    height: description.height,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    infinite: false,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    type: 'map',
    version: '1.10',
    tiledversion: '1.11.0',
    nextlayerid: layerId,
    nextobjectid: objectId,
    tilesets: [
      {
        firstgid: 1,
        name: description.tileset,
        image: meta.image,
        imagewidth: meta.imagewidth,
        imageheight: meta.imageheight,
        tilewidth: TILE_SIZE,
        tileheight: TILE_SIZE,
        columns: meta.columns,
        tilecount: meta.tilecount,
        margin: 0,
        spacing: 0,
      },
    ],
    layers,
  }
}
