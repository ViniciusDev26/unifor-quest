import { describe, expect, it } from 'vitest'
import { compileMap } from '../src/compile-map.js'
import { extractGraph } from '../src/extract-graph.js'
import type { MapDescription } from '../src/map-description.js'

const nodes = [
  { id: 'BIB', label: 'Biblioteca', x: 10, y: 20 },
  { id: 'CE', label: 'Centro Esportivo', x: 30, y: 40 },
]

const withoutGraph: MapDescription = {
  id: 'campus',
  tileset: 'world',
  width: 2,
  height: 1,
  terrain: ['..'],
  buildings: [],
}

const withGraph: MapDescription = {
  ...withoutGraph,
  graph: {
    nodes,
    edges: [{ from: 'BIB', to: 'CE', weight: 384 }],
  },
}

describe('extractGraph', () => {
  it('round-trips nodes and edges through the compiled map', () => {
    const graph = extractGraph(compileMap(withGraph))
    expect(graph).toEqual(withGraph.graph)
  })

  it('throws when the map has no graph layer', () => {
    expect(() => extractGraph(compileMap(withoutGraph))).toThrow(/graph/)
  })

  it("rejects a graph with a dangling edge, via core's own schema", () => {
    const broken = compileMap({
      ...withGraph,
      graph: { nodes, edges: [{ from: 'BIB', to: 'GHOST', weight: 1 }] },
    })
    expect(() => extractGraph(broken)).toThrow(/unknown node/)
  })
})
