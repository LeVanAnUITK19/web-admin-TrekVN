import { describe, expect, it } from 'vitest'
import type { StyleSpecification } from 'maplibre-gl'
import { entityMapStyle } from './entityMapStyle'

const base: StyleSpecification = { version: 8, sources: {
  terrain: { type: 'vector', tiles: ['offline-package://base/{z}/{x}/{y}'] },
  routes: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  milestones: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
}, layers: [
  { id: 'terrain', type: 'fill', source: 'terrain', 'source-layer': 'landcover' },
  { id: 'bundled-route', type: 'line', source: 'routes' },
  { id: 'bundled-waypoints', type: 'circle', source: 'milestones' },
] }

describe('place basemap and selected route', () => {
  it('place preview keeps offline tiles and removes bundled route overlays', () => {
    const style = entityMapStyle(base)
    expect(style.sources).toEqual({ terrain: base.sources.terrain })
    expect(style.layers.map(layer => layer.id)).toEqual(['terrain'])
    expect(base.sources.routes).toBeDefined()
  })
  it('each route keeps the same tiles and its own longitude/latitude path and endpoints', () => {
    const a = entityMapStyle(base, { type: 'LineString', coordinates: [[106.16, 11.38], [106.17, 11.39]] })
    const b = entityMapStyle(base, { type: 'LineString', coordinates: [[106.18, 11.36], [106.19, 11.37]] })
    expect(a.sources.terrain).toEqual(b.sources.terrain)
    expect(a.sources['entity-path']).not.toEqual(b.sources['entity-path'])
    expect(b.sources['entity-points']).toMatchObject({ data: { features: [
      { geometry: { coordinates: [106.18, 11.36] }, properties: { kind: 'start' } },
      { geometry: { coordinates: [106.19, 11.37] }, properties: { kind: 'end' } },
    ] } })
    expect(b.sources.routes).toBeUndefined()
  })
  it('clearing the path removes the previous overlay and retains place marker', () => {
    const old = entityMapStyle(base, { type: 'LineString', coordinates: [[106, 11], [107, 12]] })
    const cleared = entityMapStyle(old, null, { type: 'Point', coordinates: [106.17, 11.38] })
    expect(cleared.sources['entity-path']).toBeUndefined()
    expect(cleared.sources['entity-points']).toMatchObject({ data: { features: [
      { properties: { kind: 'place' }, geometry: { coordinates: [106.17, 11.38] } },
    ] } })
    expect(cleared.layers.filter(layer => layer.id === 'entity-point-circles')).toHaveLength(1)
  })
})
