import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { GeoLineString } from '@/types'
import { MapPreview } from './MapPreview'
import apiClient from '@/services/api/client'

interface FakeStyle {
  sources: Record<string, { data?: { geometry?: GeoLineString; features?: unknown[] } }>
  layers: Array<{ id: string }>
}
interface FakeMapInstance {
  getSource: (id: string) => FakeStyle['sources'][string]
}

const mocks = vi.hoisted(() => ({
  maps: [] as FakeMapInstance[], create: vi.fn(), removeProtocol: vi.fn(), dispose: vi.fn(), artifact: vi.fn(), package: vi.fn(),
}))
vi.mock('@/services/api/agentApi', () => ({ getMapArtifactFile: mocks.artifact }))
vi.mock('@/services/api/client', () => ({ default: { get: vi.fn() } }))
vi.mock('./offlinePackage', () => ({ loadOfflineMapPackage: mocks.package }))
vi.mock('maplibre-gl', () => {
  class FakeMap {
    style: FakeStyle
    constructor(options: { style: FakeStyle }) { this.style = structuredClone(options.style); mocks.maps.push(this); mocks.create(options) }
    on(event: string, callback: () => void) { if (event === 'load') queueMicrotask(callback) }
    addControl() {} fitBounds() {} resize() {} remove() {} easeTo() {}
    getStyle() { return this.style }
    addSource(id: string, source: FakeStyle['sources'][string]) { this.style.sources[id] = source }
    getSource(id: string) { return this.style.sources[id] }
    removeSource(id: string) { delete this.style.sources[id] }
    addLayer(layer: FakeStyle['layers'][number]) { this.style.layers.push(layer) }
    getLayer(id: string) { return this.style.layers.find((layer) => layer.id === id) }
    removeLayer(id: string) { this.style.layers = this.style.layers.filter((layer) => layer.id !== id) }
  }
  return { default: { Map: FakeMap, ScaleControl: class {}, addProtocol: vi.fn(), removeProtocol: mocks.removeProtocol }, LngLatBounds: class {} }
})

beforeEach(() => {
  mocks.maps.length = 0
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }))
  mocks.package.mockResolvedValue({
    protocol: 'offline-test', readTile: vi.fn(), dispose: mocks.dispose, tileCount: 20, layers: [],
    manifest: { bounds: [106.13, 11.36, 106.19, 11.41], minZoom: 10, maxZoom: 14 },
    style: { version: 8, sources: { base: { type: 'vector', tiles: ['offline-test://base/{z}/{x}/{y}'] },
      routes: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
      layers: [{ id: 'roads', type: 'line', source: 'base' }, { id: 'old-route', type: 'line', source: 'routes' }] },
  })
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })

it('reads place ZIP through authenticated backend without bucket CORS and updates path without a new download', async () => {
  const props = { placeId: 'p', checksum: 'abc', fileName: 'place.zip', placeName: 'Bà Đen' }
  vi.mocked(apiClient.get).mockResolvedValueOnce({ data: new ArrayBuffer(1) })
  const path: GeoLineString = { type: 'LineString', coordinates: [[106.16, 11.38], [106.17, 11.39]] }
  const { rerender, unmount } = render(<MapPreview {...props} path={path} />)
  await waitFor(() => expect(mocks.maps[0]?.getSource('entity-path')).toBeDefined())
  expect(apiClient.get).toHaveBeenCalledWith('/admin/trekking/places/p/offline-map/file', expect.objectContaining({ responseType: 'arraybuffer' }))
  expect(fetch).not.toHaveBeenCalled()
  expect(mocks.artifact).not.toHaveBeenCalled()
  expect(mocks.maps[0].getSource('routes')).toBeUndefined()
  const changed: GeoLineString = { type: 'LineString', coordinates: [[106.18, 11.37], [106.19, 11.40]] }
  rerender(<MapPreview {...props} path={changed} />)
  await waitFor(() => expect(mocks.maps[0].getSource('entity-path').data?.geometry).toEqual(changed))
  expect(apiClient.get).toHaveBeenCalledTimes(1)
  expect(mocks.create).toHaveBeenCalledTimes(1)
  const request = mocks.create.mock.calls[0][0].transformRequest
  expect(request('offline-test://base/10/1/1')).toEqual({ url: 'offline-test://base/10/1/1' })
  expect(() => request('https://tile.openstreetmap.org/10/1/1.png')).toThrow('offline')
  for (const button of screen.getAllByRole('button')) expect(button).toHaveAttribute('type', 'button')
  unmount()
  expect(mocks.dispose).toHaveBeenCalledTimes(1)
  expect(mocks.removeProtocol).toHaveBeenCalledWith('offline-test')
})

it('failed ZIP never creates an online fallback map', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response)
  render(<MapPreview downloadUrl="https://maps.example/missing.zip" checksum="" fileName="missing.zip" placeName="Bà Đen" />)
  expect(await screen.findByText(/HTTP 404/)).toBeInTheDocument()
  expect(mocks.create).not.toHaveBeenCalled()
})

it('moves the draft milestone without reloading the place package or losing its route', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: new ArrayBuffer(1) })
  const props = { placeId: 'p', checksum: 'abc', fileName: 'place.zip', placeName: 'Bà Đen',
    path: { type: 'LineString', coordinates: [[106.16, 11.38], [106.17, 11.39]] } as GeoLineString }
  const { rerender } = render(<MapPreview {...props} milestone={{ type: 'Point', coordinates: [106.17, 11.38] }} />)
  await waitFor(() => expect(mocks.maps[0]?.getSource('entity-points')).toBeDefined())
  rerender(<MapPreview {...props} milestone={{ type: 'Point', coordinates: [106.18, 11.40] }} />)
  await waitFor(() => expect(mocks.maps[0].getSource('entity-points').data?.features).toContainEqual({
    type: 'Feature', properties: { kind: 'milestone' }, geometry: { type: 'Point', coordinates: [106.18, 11.40] },
  }))
  expect(mocks.maps[0].getSource('entity-path').data?.geometry).toEqual(props.path)
  expect(apiClient.get).toHaveBeenCalledTimes(1)
  expect(mocks.create).toHaveBeenCalledTimes(1)
})
