import { z } from 'zod'

/**
 * The campus as data: buildings are nodes, paths are edges, distances are weights
 * (ADR 0012). The same shape feeds the graph challenges and, later, the map drawn in
 * Tiled.
 *
 * Edges are **undirected**: a path is walkable both ways, and each one is declared once.
 * Expanding them into both directions is the prelude's job, in every language.
 */
export const graphNodeSchema = z.object({
  /** Short, stable identifier used by challenges and solutions: `BIB`. */
  id: z.string().min(1),

  /** Human-readable name shown to the player: `Biblioteca`. */
  label: z.string().min(1),

  /** Position on the map. Optional: the campus map is not built yet (ADR 0029). */
  x: z.number().optional(),
  y: z.number().optional(),
})

export type GraphNode = z.infer<typeof graphNodeSchema>

export const graphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  weight: z.number().nonnegative(),
})

export type GraphEdge = z.infer<typeof graphEdgeSchema>

export const graphSchema = z
  .object({
    nodes: z.array(graphNodeSchema),
    edges: z.array(graphEdgeSchema),
  })
  .superRefine((graph, ctx) => {
    const ids = new Set<string>()

    for (const node of graph.nodes) {
      if (ids.has(node.id)) {
        ctx.addIssue({ code: 'custom', message: `duplicate node id: ${node.id}` })
      }
      ids.add(node.id)
    }

    for (const edge of graph.edges) {
      for (const endpoint of [edge.from, edge.to]) {
        if (!ids.has(endpoint)) {
          ctx.addIssue({ code: 'custom', message: `edge points at unknown node: ${endpoint}` })
        }
      }
    }
  })

export type Graph = z.infer<typeof graphSchema>
