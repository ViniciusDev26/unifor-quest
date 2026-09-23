import { describe, expect, it } from 'vitest'
import { graphSchema } from '../../src/value-objects/graph.js'

const campus = {
  nodes: [
    { id: 'BIB', label: 'Biblioteca' },
    { id: 'CE', label: 'Centro Esportivo', x: 120, y: 64 },
  ],
  edges: [{ from: 'BIB', to: 'CE', weight: 684 }],
}

describe('graphSchema', () => {
  it('accepts a graph with optional node positions', () => {
    expect(graphSchema.safeParse(campus).success).toBe(true)
  })

  it('rejects an edge pointing at a node that does not exist', () => {
    const parsed = graphSchema.safeParse({
      ...campus,
      edges: [{ from: 'BIB', to: 'GHOST', weight: 1 }],
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain('unknown node: GHOST')
  })

  it('rejects duplicate node ids', () => {
    const parsed = graphSchema.safeParse({
      nodes: [
        { id: 'BIB', label: 'Biblioteca' },
        { id: 'BIB', label: 'Biblioteca Setorial' },
      ],
      edges: [],
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain('duplicate node id: BIB')
  })

  it('rejects a negative weight', () => {
    expect(
      graphSchema.safeParse({ ...campus, edges: [{ from: 'BIB', to: 'CE', weight: -1 }] }).success,
    ).toBe(false)
  })
})
