export const PRELUDE_FILE = 'graph.ts'

/**
 * The `Graph` the player receives, in TypeScript.
 *
 * It has two jobs. It gives the player something ergonomic to walk — `nodes`, `neighbors`,
 * `label` — and it **counts**: every call to `neighbors` is one node expanded, and that is
 * the metric the game shows (ADR 0011). Time would measure process startup, not the
 * algorithm.
 *
 * Built as a factory over a closure rather than a class, like the rest of the project
 * (ADR 0039) — in Go, Java and Python the prelude uses whatever is idiomatic there.
 */
export const preludeSource = `export type Edge = { to: string; weight: number }

export type Graph = {
  /** Every node id in the graph. */
  nodes(): string[]
  /** The edges leaving a node. Each call counts as one node explored. */
  neighbors(id: string): Edge[]
  /** The name a person reads, as opposed to the id an algorithm uses. */
  label(id: string): string
}

let explored = 0

export function resetOps(): void {
  explored = 0
}

export function opsCount(): number {
  return explored
}

export function buildGraph(raw: unknown): Graph {
  const source = raw as {
    nodes?: { id: string; label: string }[]
    edges?: { from: string; to: string; weight: number }[]
  }

  const labels = new Map((source.nodes ?? []).map((node) => [node.id, node.label]))
  const adjacency = new Map<string, Edge[]>((source.nodes ?? []).map((node) => [node.id, []]))

  // Edges are undirected and declared once, so both directions are filled in here.
  for (const edge of source.edges ?? []) {
    adjacency.get(edge.from)?.push({ to: edge.to, weight: edge.weight })
    adjacency.get(edge.to)?.push({ to: edge.from, weight: edge.weight })
  }

  return {
    nodes() {
      return [...labels.keys()]
    },
    neighbors(id) {
      explored += 1
      return adjacency.get(id) ?? []
    },
    label(id) {
      return labels.get(id) ?? id
    }
  }
}
`
