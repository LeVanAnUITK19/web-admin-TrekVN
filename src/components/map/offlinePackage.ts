import JSZip from 'jszip'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { AddProtocolAction, StyleSpecification } from 'maplibre-gl'

export type PackageBounds = [number, number, number, number]
interface PackageLayer { id: string; file: string; type: 'vector' | 'raster' }
export interface OfflineManifest {
  packageId: string
  name: string
  bounds: PackageBounds
  minZoom: number
  maxZoom: number
  style?: string
  layers: PackageLayer[]
  geojson?: Record<string, string>
}
export interface PreviewLayer { id: string; label: string; styleLayerIds: string[] }
export interface OfflineMapPackage {
  protocol: string
  manifest: OfflineManifest
  style: StyleSpecification
  layers: PreviewLayer[]
  tileCount: number
  readTile: AddProtocolAction
  dispose: () => void
}

let sqlitePromise: Promise<SqlJsStatic> | undefined
let packageSequence = 0
const TRANSPARENT_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='

function bytesBuffer(bytes: Uint8Array): ArrayBuffer {
  // MapLibre transfers this buffer to its worker, so never return SQLite's memory.
  return Uint8Array.from(bytes).buffer
}

function missingRaster(): ArrayBuffer {
  return bytesBuffer(Uint8Array.from(atob(TRANSPARENT_PNG), c => c.charCodeAt(0)))
}

export async function loadOfflineMapPackage(
  data: ArrayBuffer,
  options: { checksum?: string; bounds?: PackageBounds; sqlite?: SqlJsStatic } = {},
): Promise<OfflineMapPackage> {
  if (options.checksum && globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data)
    const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    if (actual !== options.checksum.toLowerCase()) throw new Error('Checksum ZIP không khớp tác vụ đang xem.')
  }
  const zip = await JSZip.loadAsync(data, { checkCRC32: true })
  const json = async (file: string) => {
    const entry = zip.file(file)
    if (!entry) throw new Error(`Gói offline thiếu ${file}.`)
    return JSON.parse(await entry.async('string'))
  }
  const manifest = await json('manifest.json') as OfflineManifest
  if (!Array.isArray(manifest.bounds) || manifest.bounds.length !== 4 ||
      !manifest.bounds.every(Number.isFinite) || manifest.bounds[0] >= manifest.bounds[2] ||
      manifest.bounds[1] >= manifest.bounds[3] || !Array.isArray(manifest.layers) || !manifest.layers.length ||
      !Number.isInteger(manifest.minZoom) || !Number.isInteger(manifest.maxZoom) ||
      manifest.minZoom < 0 || manifest.maxZoom > 22 || manifest.minZoom > manifest.maxZoom) {
    throw new Error('Manifest không chứa vùng cắt và các lớp bản đồ hợp lệ.')
  }
  if (options.bounds?.some((v, i) => Math.abs(v - manifest.bounds[i]) > 0.000001)) {
    throw new Error('BBOX trong ZIP khác tác vụ đang xem. Hãy tải lại kết quả.')
  }
  const style = await json(manifest.style || 'style.json') as StyleSpecification
  if (style.version !== 8 || !style.sources || !Array.isArray(style.layers)) {
    throw new Error('Style trong gói offline không hợp lệ.')
  }
  // Generated packages use inline GeoJSON and no remote glyphs/sprites.
  if (style.glyphs || style.sprite) throw new Error('Style yêu cầu glyph/sprite chưa được đóng gói offline.')
  const SQL = options.sqlite ?? await (sqlitePromise ??= initSqlJs({ locateFile: () => wasmUrl }))
  const databases = new Map<string, { db: Database; type: 'vector' | 'raster'; scheme: string }>()
  let tileCount = 0
  const dispose = () => {
    databases.forEach(({ db }) => db.close())
    databases.clear()
  }
  const protocol = `offline-map-${++packageSequence}`
  const groups = new Map<string, PreviewLayer>()
  const sourceGroups = new Map<string, string>()
  try {
    for (const layer of manifest.layers) {
      if (!['vector', 'raster'].includes(layer.type) || databases.has(layer.file)) {
        throw new Error(`Lớp offline không hợp lệ: ${layer.file}.`)
      }
      const entry = zip.file(layer.file)
      if (!entry) throw new Error(`Gói offline thiếu ${layer.file}.`)
      const db = new SQL.Database(await entry.async('uint8array'))
      databases.set(layer.file, { db, type: layer.type, scheme: 'tms' })
      const metadata = Object.fromEntries((db.exec('SELECT name, value FROM metadata')[0]?.values ?? []).map(row => [String(row[0]), String(row[1])]))
      const count = Number(db.exec('SELECT COUNT(*) FROM tiles')[0]?.values[0][0] ?? 0)
      if (!count) throw new Error(`${layer.file} không có tile bản đồ.`)
      if (metadata.scheme && !['tms', 'xyz'].includes(metadata.scheme)) throw new Error(`Scheme tile không hợp lệ: ${layer.file}.`)
      databases.get(layer.file)!.scheme = metadata.scheme || 'tms'
      tileCount += count
    }
    for (const [sourceId, source] of Object.entries(style.sources)) {
      if (source.type === 'vector' || source.type === 'raster') {
        if (!source.url?.startsWith('mbtiles://')) throw new Error(`Nguồn ${sourceId} không trỏ vào MBTiles trong ZIP.`)
        const file = source.url.slice('mbtiles://'.length)
        const stored = databases.get(file)
        if (!stored || stored.type !== source.type) throw new Error(`Không tìm thấy MBTiles cho ${sourceId}.`)
        const [range] = stored.db.exec('SELECT MIN(zoom_level), MAX(zoom_level) FROM tiles')
        delete source.url
        source.tiles = [`${protocol}://package/${encodeURIComponent(file)}/{z}/{x}/{y}`]
        source.scheme = 'xyz'
        source.bounds = manifest.bounds
        source.minzoom = Number(range.values[0][0])
        source.maxzoom = Number(range.values[0][1])
        sourceGroups.set(sourceId, manifest.layers.find(layer => layer.file === file)!.id)
      } else if (source.type === 'geojson') {
        if (typeof source.data === 'string') source.data = await json(source.data)
        sourceGroups.set(sourceId, sourceId.replace(/-source$/, ''))
      } else {
        throw new Error(`Nguồn ${sourceId} chưa được đóng gói offline.`)
      }
    }
    for (const layer of style.layers) {
      if (!('source' in layer) || !layer.source) continue
      let groupId = sourceGroups.get(layer.source)!
      if (groupId === 'base') {
        const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : ''
        groupId = sourceLayer === 'transportation' ? 'roads' : ['poi', 'mountain_peak', 'place'].includes(sourceLayer || '') ? 'poi' : 'terrain'
      }
      const labels: Record<string, string> = { roads: 'Đường', poi: 'Điểm quan tâm', terrain: 'Nền địa hình', contours: 'Đường đồng mức', hillshade: 'Đổ bóng địa hình', routes: 'Tuyến đường', milestones: 'Mốc hành trình' }
      if (!groups.has(groupId)) groups.set(groupId, { id: groupId, label: labels[groupId] || groupId, styleLayerIds: [] })
      groups.get(groupId)!.styleLayerIds.push(layer.id)
    }
    const readTile: AddProtocolAction = async ({ url }, abortController) => {
      if (abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      const prefix = `${protocol}://package/`
      if (!url.startsWith(prefix)) throw new Error('Tile không thuộc gói offline đang xem.')
      const parts = url.slice(prefix.length).split('/')
      if (parts.length !== 4) throw new Error('Địa chỉ tile offline không hợp lệ.')
      const file = decodeURIComponent(parts[0])
      const stored = databases.get(file)
      if (!stored) throw new Error('Gói offline đã đóng hoặc thiếu lớp tile.')
      const [z, x, y] = parts.slice(1).map(Number)
      if (![z, x, y].every(Number.isInteger) || z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
        throw new Error('Tọa độ tile offline không hợp lệ.')
      }
      const row = stored.scheme === 'xyz' ? y : 2 ** z - 1 - y
      const result = stored.db.exec('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ? LIMIT 1', [z, x, row])
      const bytes = result[0]?.values[0][0] as Uint8Array | undefined
      if (!bytes) return { data: stored.type === 'vector' ? new ArrayBuffer(0) : missingRaster() }
      let buffer = bytesBuffer(bytes)
      if (stored.type === 'vector' && bytes[0] === 0x1f && bytes[1] === 0x8b) {
        buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
      }
      if (abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      return { data: buffer }
    }
    return { protocol, manifest, style, layers: [...groups.values()], tileCount, readTile, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}
