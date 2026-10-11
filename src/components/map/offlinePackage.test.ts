// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import JSZip from 'jszip'
import { loadOfflineMapPackage, type PackageBounds } from './offlinePackage'
import { BA_DEN_REFERENCE_BBOX, isOutsideBaDenReference } from '@/features/agent/map-builder/mapRegion'

let SQL: SqlJsStatic
const bounds: PackageBounds = [106.13943, 11.36157, 106.19162, 11.41239]
const vectorBytes = Uint8Array.from([26, 2, 120, 2])
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'))
beforeAll(async () => { SQL = await initSqlJs({ wasmBinary: Uint8Array.from(readFileSync('node_modules/sql.js/dist/sql-wasm.wasm')).buffer }) })

function mbtiles(bytes: Uint8Array, scheme = 'tms') {
  const db = new SQL.Database()
  db.run('CREATE TABLE metadata(name TEXT, value TEXT); CREATE TABLE tiles(zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB)')
  db.run('INSERT INTO metadata VALUES (?, ?)', ['scheme', scheme])
  db.run('INSERT INTO tiles VALUES (?, ?, ?, ?)', [10, 814, scheme === 'tms' ? 543 : 480, bytes])
  const data = db.export()
  db.close()
  return data
}

async function fixture({ remote = false, missing = false, scheme = 'tms' } = {}) {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify({ packageId: 'ba-den-v1', name: 'Bà Đen', bounds, minZoom: 10, maxZoom: 14,
    layers: [{ id: 'base', file: 'base.mbtiles', type: 'vector' }, { id: 'hillshade', file: 'shade.mbtiles', type: 'raster' }] }))
  zip.file('style.json', JSON.stringify({ version: 8, sources: {
    base: { type: 'vector', url: remote ? 'https://tile.example.com/map.json' : 'mbtiles://base.mbtiles' },
    shade: { type: 'raster', url: 'mbtiles://shade.mbtiles', tileSize: 256 },
    routes: { type: 'geojson', data: 'routes.geojson' },
  }, layers: [
    { id: 'road', type: 'line', source: 'base', 'source-layer': 'transportation' },
    { id: 'hillshade', type: 'raster', source: 'shade' },
    { id: 'route', type: 'line', source: 'routes' },
  ] }))
  if (!missing) zip.file('base.mbtiles', mbtiles(gzipSync(vectorBytes), scheme))
  zip.file('shade.mbtiles', mbtiles(png))
  zip.file('routes.geojson', JSON.stringify({ type: 'FeatureCollection', features: [] }))
  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('offline ZIP preview', () => {
  it('reads TMS gzip vector and raster tiles without any network fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'))
    const pkg = await loadOfflineMapPackage(await fixture(), { sqlite: SQL, bounds })
    try {
      expect(pkg.tileCount).toBe(2)
      const source = pkg.style.sources.base
      expect(source.type).toBe('vector')
      if (source.type !== 'vector') throw new Error('Expected vector source')
      expect(source.url).toBeUndefined()
      expect(source.maxzoom).toBe(10)
      const url = source.tiles![0].replace('{z}/{x}/{y}', '10/814/480')
      const tile = await pkg.readTile({ url }, new AbortController())
      expect(new Uint8Array(tile.data)).toEqual(vectorBytes)
      // Repeated requests must have independent buffers for transferable worker data.
      const again = await pkg.readTile({ url }, new AbortController())
      expect(again.data).not.toBe(tile.data)
      const raster = await pkg.readTile({ url: `${pkg.protocol}://package/shade.mbtiles/10/814/480` }, new AbortController())
      expect(new Uint8Array(raster.data)).toEqual(png)
      const hole = await pkg.readTile({ url: `${pkg.protocol}://package/base.mbtiles/10/813/480` }, new AbortController())
      expect(hole.data.byteLength).toBe(0)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(pkg.layers.map(layer => layer.id)).toEqual(['roads', 'hillshade', 'routes'])
      expect(pkg.style.sources.routes).toMatchObject({ data: { type: 'FeatureCollection', features: [] } })
    } finally { pkg.dispose(); fetchSpy.mockRestore() }
  })
  it('also respects explicit XYZ MBTiles rows', async () => {
    const pkg = await loadOfflineMapPackage(await fixture({ scheme: 'xyz' }), { sqlite: SQL })
    try {
      const tile = await pkg.readTile({ url: `${pkg.protocol}://package/base.mbtiles/10/814/480` }, new AbortController())
      expect(new Uint8Array(tile.data)).toEqual(vectorBytes)
    } finally { pkg.dispose() }
  })
  it('rejects a ZIP belonging to different coordinates', async () => {
    await expect(loadOfflineMapPackage(await fixture(), { sqlite: SQL, bounds: [107.35, 10.91, 107.40, 10.96] })).rejects.toThrow('BBOX')
  })
  it('rejects stale/corrupted ZIP checksum', async () => {
    const data = await fixture()
    const checksum = createHash('sha256').update(new Uint8Array(data)).digest('hex')
    const pkg = await loadOfflineMapPackage(data, { sqlite: SQL, checksum })
    pkg.dispose()
    await expect(loadOfflineMapPackage(data, { sqlite: SQL, checksum: '0'.repeat(64) })).rejects.toThrow('Checksum')
  })
  it('refuses online sources instead of falling back', async () => {
    await expect(loadOfflineMapPackage(await fixture({ remote: true }), { sqlite: SQL })).rejects.toThrow('không trỏ vào MBTiles')
  })
  it('rejects a style-only package with missing map payload', async () => {
    await expect(loadOfflineMapPackage(await fixture({ missing: true }), { sqlite: SQL })).rejects.toThrow('thiếu base.mbtiles')
  })
  it('keeps concurrent package protocols independent and supports cancellation', async () => {
    const a = await loadOfflineMapPackage(await fixture(), { sqlite: SQL })
    const b = await loadOfflineMapPackage(await fixture(), { sqlite: SQL })
    try {
      expect(a.protocol).not.toBe(b.protocol)
      await expect(b.readTile({ url: `${a.protocol}://package/base.mbtiles/10/814/480` }, new AbortController())).rejects.toThrow('không thuộc')
      const abort = new AbortController()
      abort.abort()
      await expect(a.readTile({ url: `${a.protocol}://package/base.mbtiles/10/814/480` }, abort)).rejects.toMatchObject({ name: 'AbortError' })
    } finally { a.dispose(); b.dispose() }
  })
  it('identifies the reported wrong Ba Den region without moving the map', () => {
    expect(isOutsideBaDenReference('Núi bà đen', { minLng: 107.3514, minLat: 10.9161, maxLng: 107.4032, maxLat: 10.964 })).toBe(true)
    expect(isOutsideBaDenReference('Núi Bà Đen', BA_DEN_REFERENCE_BBOX)).toBe(false)
    expect(isOutsideBaDenReference('Núi Chứa Chan', { minLng: 107.3514, minLat: 10.9161, maxLng: 107.4032, maxLat: 10.964 })).toBe(false)
  })
})
