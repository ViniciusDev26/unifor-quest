/**
 * The slice of the Tiled JSON map format this package actually writes and reads back
 * (ADR 0058) — embedded tilesets only (`source` tilesets are not supported by Phaser's
 * parser), object `properties` kept as Tiled's own array of `{name, type, value}` triples,
 * never flattened, because that is the literal shape a real `.tmj` file carries.
 */
export type TiledProperty = { name: string; type: string; value: string | number | boolean }

export type TiledObject = {
  id: number
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  visible: boolean
  properties: TiledProperty[]
  point?: true
}

export type TiledObjectLayer = {
  id: number
  name: string
  type: 'objectgroup'
  draworder: 'topdown'
  opacity: number
  visible: boolean
  x: number
  y: number
  objects: TiledObject[]
}

export type TiledTileLayer = {
  id: number
  name: string
  type: 'tilelayer'
  width: number
  height: number
  x: number
  y: number
  opacity: number
  visible: boolean
  data: number[]
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer

export type TiledTileset = {
  firstgid: number
  name: string
  image: string
  imagewidth: number
  imageheight: number
  tilewidth: number
  tileheight: number
  columns: number
  tilecount: number
  margin: number
  spacing: number
}

export type TiledMap = {
  compressionlevel: -1
  width: number
  height: number
  tilewidth: number
  tileheight: number
  infinite: false
  orientation: 'orthogonal'
  renderorder: 'right-down'
  type: 'map'
  version: string
  tiledversion: string
  nextlayerid: number
  nextobjectid: number
  tilesets: TiledTileset[]
  layers: TiledLayer[]
}

/** Tiled's own array-of-triples, turned into the plain map every reader actually wants. */
export function propertiesOf(object: TiledObject): Record<string, string | number | boolean> {
  const flat: Record<string, string | number | boolean> = {}
  for (const property of object.properties) {
    flat[property.name] = property.value
  }
  return flat
}
