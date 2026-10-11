import type { StyleSpecification } from 'maplibre-gl'
import type { GeoLineString, GeoPoint } from '@/types'

export function entityMapStyle(base: StyleSpecification, path?: GeoLineString | null, location?: GeoPoint | null, milestone?: GeoPoint | null): StyleSpecification {
  const style = structuredClone(base)
  const removed = new Set(Object.keys(style.sources).filter(id => id.startsWith('entity-') ||
    style.sources[id].type === 'geojson' && /route|milestone/i.test(id)))
  removed.forEach(id => delete style.sources[id])
  style.layers = style.layers.filter(layer => !('source' in layer) || !removed.has(layer.source as string))
  if (path?.coordinates.length && path.coordinates.length >= 2) {
    style.sources['entity-path'] = { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: path } }
    style.layers.push({ id: 'entity-path-line', type: 'line', source: 'entity-path',
      layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#e8620a', 'line-width': 4 } })
  }
  const points = [
    ...(location ? [{ point: location.coordinates, kind: 'place' }] : []),
    ...(milestone ? [{ point: milestone.coordinates, kind: 'milestone' }] : []),
    ...(path && path.coordinates.length >= 2 ? [
      { point: path.coordinates[0], kind: 'start' }, { point: path.coordinates[path.coordinates.length - 1], kind: 'end' },
    ] : []),
  ]
  if (points.length) {
    style.sources['entity-points'] = { type: 'geojson', data: { type: 'FeatureCollection', features: points.map(p => ({
      type: 'Feature', properties: { kind: p.kind }, geometry: { type: 'Point', coordinates: p.point },
    })) } }
    style.layers.push({ id: 'entity-point-circles', type: 'circle', source: 'entity-points', paint: {
      'circle-radius': ['match', ['get', 'kind'], 'milestone', 9, 6],
      'circle-color': ['match', ['get', 'kind'], 'milestone', '#2563eb', 'end', '#ef4444', '#16a34a'],
      'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2,
    } })
  }
  return style
}
