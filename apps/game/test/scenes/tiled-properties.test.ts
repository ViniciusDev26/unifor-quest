import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { tiledPropertiesSchema } from '../../src/renderer/src/scenes/tiled-properties.js'

const mapSchema = z.object({
  layers: z.array(
    z.object({
      name: z.string(),
      objects: z.array(z.object({ properties: z.unknown() })).optional(),
    }),
  ),
})

const campusMap = mapSchema.parse(
  JSON.parse(readFileSync(new URL('../../../../content/maps/campus.tmj', import.meta.url), 'utf8')),
)

describe('tiledPropertiesSchema', () => {
  // The campus scene parses these when it loads: a map it rejects would stop the game there.
  it('accepts every object the campus scene reads from the real map', () => {
    const objects = campusMap.layers.find((layer) => layer.name === 'buildings')?.objects ?? []
    const rejected = objects.filter(
      (object) => !tiledPropertiesSchema.safeParse(object.properties).success,
    )
    expect(objects.length).toBeGreaterThan(0)
    expect(rejected).toEqual([])
  })

  it('keeps the name and the value of a property', () => {
    const parsed = tiledPropertiesSchema.parse([
      { name: 'buildingId', type: 'string', value: 'biblioteca' },
    ])
    expect(parsed).toEqual([{ name: 'buildingId', value: 'biblioteca' }])
  })

  it.each([
    { label: 'a value of no known type', properties: [{ name: 'kind', value: null }] },
    { label: 'a property without a name', properties: [{ value: 'rect' }] },
    { label: 'anything but a list', properties: { kind: 'rect' } },
  ])('rejects $label', ({ properties }) => {
    expect(tiledPropertiesSchema.safeParse(properties).success).toBe(false)
  })
})
