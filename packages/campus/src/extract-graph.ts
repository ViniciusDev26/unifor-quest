import { type Graph, graphSchema } from '@unifor-quest/core'
import { propertiesOf, type TiledMap, type TiledObjectLayer } from './tiled-json.js'

/**
 * Reads the campus graph back out of a compiled map's `graph` object layer (ADR 0012): the
 * same file that draws the campus is the same data that feeds BFS/Dijkstra challenges and,
 * eventually, the walked route. Validated against `core`'s `graphSchema` — a dangling edge
 * or a duplicate node id fails here, at content time, not on a player's screen.
 */
export function extractGraph(map: TiledMap): Graph {
  const layer = map.layers.find(
    (candidate): candidate is TiledObjectLayer =>
      candidate.type === 'objectgroup' && candidate.name === 'graph',
  )

  if (layer === undefined) {
    throw new Error('map has no "graph" object layer')
  }

  const nodes: Graph['nodes'] = []
  const edges: Graph['edges'] = []

  for (const object of layer.objects) {
    const properties = propertiesOf(object)

    if (object.type === 'node') {
      nodes.push({
        id: String(properties['nodeId']),
        label: object.name,
        x: object.x,
        y: object.y,
      })
    } else if (object.type === 'edge') {
      edges.push({
        from: String(properties['from']),
        to: String(properties['to']),
        weight: Number(properties['weight']),
      })
    }
  }

  return graphSchema.parse({ nodes, edges })
}
