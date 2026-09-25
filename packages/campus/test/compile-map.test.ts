import { describe, expect, it } from 'vitest'
import { compileMap } from '../src/compile-map.js'
import type { MapDescription } from '../src/map-description.js'

const base: MapDescription = {
  id: 'test',
  tileset: 'world',
  width: 3,
  height: 2,
  terrain: ['.#.', ' ..'],
  buildings: [],
}

describe('compileMap', () => {
  it('embeds one tileset with no external source', () => {
    const map = compileMap(base)
    expect(map.tilesets).toHaveLength(1)
    expect(map.tilesets[0]).not.toHaveProperty('source')
    expect(map.tilesets[0]?.image).toBe('../../assets/graphics/graphics/tilesets/world.png')
  })

  it('maps each terrain character to the right gid', () => {
    const map = compileMap(base)
    const ground = map.layers.find((layer) => layer.name === 'ground')
    if (ground?.type !== 'tilelayer') {
      throw new Error('expected a tile layer')
    }
    // firstgid 1 + grass index 0, path index 206; ' ' is empty (gid 0).
    expect(ground.data).toEqual([1, 207, 1, 0, 1, 1])
  })

  it('rejects terrain with the wrong number of rows or columns', () => {
    expect(() => compileMap({ ...base, height: 3 })).toThrow(/rows/)
    expect(() => compileMap({ ...base, terrain: ['.#', ' ..'] })).toThrow(/columns/)
  })

  it('rejects an unknown terrain character', () => {
    expect(() => compileMap({ ...base, terrain: ['.#x', ' ..'] })).toThrow(/terrain character/)
  })

  it('places buildings as objects with no gid, carrying their asset as a property', () => {
    const map = compileMap({
      ...base,
      buildings: [
        {
          id: 'bib',
          label: 'Biblioteca',
          asset: 'house_large',
          x: 32,
          y: 16,
          width: 320,
          height: 320,
        },
      ],
    })
    const layer = map.layers.find((l) => l.name === 'buildings')
    if (layer?.type !== 'objectgroup') {
      throw new Error('expected an object layer')
    }
    const [object] = layer.objects
    expect(object).toBeDefined()
    expect(object).not.toHaveProperty('gid')
    expect(object?.x).toBe(32)
    expect(object?.properties).toContainEqual({
      name: 'asset',
      type: 'string',
      value: 'house_large',
    })
  })

  it('adds a graph object layer only when a graph is given', () => {
    expect(compileMap(base).layers.some((l) => l.name === 'graph')).toBe(false)

    const withGraph = compileMap({
      ...base,
      graph: {
        nodes: [{ id: 'A', label: 'A', x: 0, y: 0 }],
        edges: [],
      },
    })
    expect(withGraph.layers.some((l) => l.name === 'graph')).toBe(true)
  })
})
