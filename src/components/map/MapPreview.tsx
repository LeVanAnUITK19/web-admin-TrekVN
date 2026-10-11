import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MapLibreMap, LngLatBounds } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Maximize2, ZoomIn, ZoomOut, Layers, Loader2, AlertCircle, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMapArtifactFile } from '@/services/api/agentApi'
import type { OfflineMapPackage, PreviewLayer } from './offlinePackage'
import type { GeoLineString, GeoPoint } from '@/types'
import { entityMapStyle } from './entityMapStyle'
import apiClient from '@/services/api/client'

export interface MapBBox { minLng: number; minLat: number; maxLng: number; maxLat: number }
export interface MapPreviewProps {
  jobId?: string
  placeId?: string
  downloadUrl?: string
  checksum: string
  fileName: string
  bbox?: MapBBox
  path?: GeoLineString | null
  location?: GeoPoint | null
  milestone?: GeoPoint | null
  placeName: string
  className?: string
}

/** The only tile source is the ZIP created by this job, read locally via SQLite. */
export function MapPreview({ jobId, placeId, downloadUrl, checksum, fileName, bbox, path, location, milestone, placeName, className }: MapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [enabledLayers, setEnabledLayers] = useState<Set<string>>(new Set())
  const [previewLayers, setPreviewLayers] = useState<PreviewLayer[]>([])
  const [info, setInfo] = useState<{ tiles: number; minZoom: number; maxZoom: number; bbox: MapBBox }>()
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const minLngHint = bbox?.minLng
  const minLatHint = bbox?.minLat
  const maxLngHint = bbox?.maxLng
  const maxLatHint = bbox?.maxLat

  useEffect(() => {
    const controller = new AbortController()
    let offline: OfflineMapPackage | undefined
    let newMap: MapLibreMap | undefined
    let protocolRegistered = false
    setPhase('loading')
    setError('')
    setInfo(undefined)
    setPreviewLayers([])
    const load = async () => {
      try {
        const data = jobId ? await getMapArtifactFile(jobId, controller.signal) : placeId ?
          (await apiClient.get<ArrayBuffer>(`/admin/trekking/places/${placeId}/offline-map/file`, {
            responseType: 'arraybuffer', signal: controller.signal, timeout: 120000,
          })).data : await downloadPackage(downloadUrl, controller.signal)
        const { loadOfflineMapPackage } = await import('./offlinePackage')
        if (controller.signal.aborted) return
        offline = await loadOfflineMapPackage(data, {
          checksum, bounds: minLngHint !== undefined && minLatHint !== undefined && maxLngHint !== undefined && maxLatHint !== undefined
            ? [minLngHint, minLatHint, maxLngHint, maxLatHint] : undefined,
        })
        if (controller.signal.aborted || !mapContainer.current) { offline.dispose(); return }
        maplibregl.addProtocol(offline.protocol, offline.readTile)
        protocolRegistered = true
        const baseStyle = jobId ? offline.style : entityMapStyle(offline.style)
        const availableIds = new Set(baseStyle.layers.map(layer => layer.id))
        const availableLayers = offline.layers.map(layer => ({ ...layer,
          styleLayerIds: layer.styleLayerIds.filter(id => availableIds.has(id)) })).filter(layer => layer.styleLayerIds.length)
        setPreviewLayers(availableLayers)
        setEnabledLayers(new Set(availableLayers.map(layer => layer.id)))
        const [minLng, minLat, maxLng, maxLat] = offline.manifest.bounds
        const box = { minLng, minLat, maxLng, maxLat }
        setInfo({ tiles: offline.tileCount, minZoom: offline.manifest.minZoom, maxZoom: offline.manifest.maxZoom, bbox: box })
        newMap = new maplibregl.Map({
          container: mapContainer.current,
          style: baseStyle,
          center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
          zoom: offline.manifest.minZoom,
          minZoom: offline.manifest.minZoom,
          maxZoom: offline.manifest.maxZoom,
          renderWorldCopies: false,
          transformRequest: url => {
            if (!url.startsWith(`${offline!.protocol}://`)) throw new Error('Nguồn bản đồ không thuộc gói offline.')
            return { url }
          },
        })
        map.current = newMap
        newMap.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), 'bottom-left')
        newMap.fitBounds(new LngLatBounds([minLng, minLat], [maxLng, maxLat]), {
          padding: { top: 90, bottom: 100, left: 25, right: 25 }, duration: 0,
        })
        newMap.on('error', event => {
          if (!controller.signal.aborted) {
            setError(`Không đọc được bản đồ trong ZIP: ${event.error.message}`)
            setPhase('error')
          }
        })
        newMap.on('load', () => {
          if (controller.signal.aborted) return
          newMap!.addSource('preview-bbox', {
            type: 'geojson', data: { type: 'Feature', properties: {}, geometry: {
              type: 'Polygon', coordinates: [[
                [minLng, minLat], [maxLng, minLat],
                [maxLng, maxLat], [minLng, maxLat], [minLng, minLat],
              ]],
            } },
          })
          newMap!.addLayer({ id: 'preview-bbox-outline', type: 'line', source: 'preview-bbox',
            paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [2, 1] } })
          setPhase(current => current === 'error' ? current : 'ready')
        })
      } catch (cause) {
        if (!controller.signal.aborted) {
          const status = (cause as { response?: { status?: number } }).response?.status
          setError(status === 404 ? 'ZIP chưa sẵn sàng hoặc đã hết thời gian lưu. Hãy tạo lại gói bản đồ.' :
            cause instanceof Error ? cause.message : 'Không thể đọc gói bản đồ offline.')
          setPhase('error')
        }
      }
    }
    void load()
    return () => {
      controller.abort()
      newMap?.remove()
      map.current = null
      if (offline) {
        if (protocolRegistered) maplibregl.removeProtocol(offline.protocol)
        offline.dispose()
      }
    }
  }, [jobId, placeId, downloadUrl, checksum, minLngHint, minLatHint, maxLngHint, maxLatHint, retry])

  useEffect(() => {
    if (phase !== 'ready' || !map.current) return
    const current = map.current
    const style = entityMapStyle(current.getStyle(), path, location, milestone)
    // Only change these GeoJSON layers. Editing the path must not re-download
    // or re-open the place's MBTiles package.
    for (const id of ['entity-path-line', 'entity-point-circles']) if (current.getLayer(id)) current.removeLayer(id)
    for (const id of ['entity-path', 'entity-points']) if (current.getSource(id)) current.removeSource(id)
    for (const id of ['entity-path', 'entity-points']) if (style.sources[id]) current.addSource(id, style.sources[id])
    style.layers.filter(layer => ['entity-path-line', 'entity-point-circles'].includes(layer.id)).forEach(layer => current.addLayer(layer))
  }, [path, location, milestone, phase])

  const milestoneLng = milestone?.coordinates[0]
  const milestoneLat = milestone?.coordinates[1]
  useEffect(() => {
    if (phase !== 'ready' || milestoneLng === undefined || milestoneLat === undefined) return
    const timer = window.setTimeout(() => map.current?.easeTo({ center: [milestoneLng, milestoneLat], duration: 250 }), 250)
    return () => window.clearTimeout(timer)
  }, [phase, milestoneLng, milestoneLat])

  useEffect(() => {
    if (!mapContainer.current) return
    const observer = new ResizeObserver(() => map.current?.resize())
    observer.observe(mapContainer.current)
    return () => observer.disconnect()
  }, [])

  const toggleLayer = (layer: PreviewLayer) => {
    const visible = !enabledLayers.has(layer.id)
    layer.styleLayerIds.forEach(id => map.current?.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'))
    setEnabledLayers(current => {
      const next = new Set(current)
      if (visible) next.add(layer.id)
      else next.delete(layer.id)
      return next
    })
  }

  return (
    <div className={cn('relative bg-white border border-border rounded-lg shadow-card overflow-hidden',
      isFullscreen && 'fixed inset-4 z-50', className)}>
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 px-4 py-2 border-b border-border flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Xem trước bản đồ offline</h3>
          <p className="text-xs text-muted-foreground truncate">{placeName}</p>
          <p className="text-xs text-primary truncate" title={fileName}>{fileName}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowLayers(!showLayers)} disabled={phase !== 'ready'}
            className="p-2 rounded hover:bg-muted disabled:opacity-40" title="Lớp bản đồ" aria-label="Lớp bản đồ">
            <Layers className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded hover:bg-muted"
            title={isFullscreen ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ'} aria-label={isFullscreen ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ'}>
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showLayers && phase === 'ready' && (
        <div className="absolute top-20 right-3 z-20 bg-white border border-border rounded-lg shadow-lg p-3 w-52">
          <p className="text-xs font-semibold mb-2">Các lớp trong gói offline</p>
          <div className="space-y-2">
            {previewLayers.map(layer => (
              <label key={layer.id} className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={enabledLayers.has(layer.id)} onChange={() => toggleLayer(layer)} />
                <span>{layer.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div ref={mapContainer} className={cn('w-full', isFullscreen ? 'h-full' : 'h-[28rem]')} />
      {phase !== 'ready' && (
        <div className="absolute inset-0 top-20 z-10 bg-white/95 flex flex-col items-center justify-center gap-3 p-6 text-center" role="status">
          {phase === 'loading' ? <>
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Đang tải ZIP và đọc các lớp bản đồ offline…</p>
          </> : <>
            <AlertCircle className="w-6 h-6 text-destructive" />
            <p className="text-sm">{error}</p>
            <button type="button" onClick={() => setRetry(value => value + 1)} className="text-sm text-primary flex items-center gap-1">
              <RefreshCcw className="w-4 h-4" /> Tải lại gói offline
            </button>
          </>}
        </div>
      )}
      {phase === 'ready' && info && <>
        {milestone && (milestone.coordinates[0] < info.bbox.minLng || milestone.coordinates[0] > info.bbox.maxLng ||
          milestone.coordinates[1] < info.bbox.minLat || milestone.coordinates[1] > info.bbox.maxLat) &&
          <p role="status" className="absolute top-24 left-3 right-3 z-10 rounded bg-white/95 border border-amber-300 p-2 text-xs text-amber-800">Cột mốc nằm ngoài vùng bản đồ offline của địa điểm. Kiểm tra lại tọa độ.</p>}
        <div className="absolute bottom-10 left-3 z-10 bg-white/95 rounded-lg shadow border border-border px-3 py-2 text-xs">
          <p className="font-medium text-primary">Đang xem từ ZIP · {info.tiles} tile</p>
          <p className="font-mono mt-1">{info.bbox.minLng.toFixed(4)}, {info.bbox.minLat.toFixed(4)}<br />{info.bbox.maxLng.toFixed(4)}, {info.bbox.maxLat.toFixed(4)}</p>
          <p className="text-muted-foreground mt-1">Zoom: {info.minZoom}–{info.maxZoom} · Không dùng tile online</p>
        </div>
        <div className="absolute bottom-10 right-3 z-10 flex flex-col bg-white rounded-lg shadow border border-border overflow-hidden">
          <button type="button" onClick={() => map.current?.zoomIn({ duration: 300 })} className="p-2 hover:bg-muted" title="Phóng gần" aria-label="Phóng gần"><ZoomIn className="w-4 h-4" /></button>
          <button type="button" onClick={() => map.current?.zoomOut({ duration: 300 })} className="p-2 hover:bg-muted border-t border-border" title="Thu xa" aria-label="Thu xa"><ZoomOut className="w-4 h-4" /></button>
        </div>
      </>}
    </div>
  )
}

async function downloadPackage(url: string | undefined, signal: AbortSignal): Promise<ArrayBuffer> {
  if (!url) throw new Error('Địa điểm chưa có file bản đồ offline đã xuất bản.')
  const response = await fetch(url, { signal, credentials: 'omit' })
  if (!response.ok) throw new Error(`Không tải được gói bản đồ offline (HTTP ${response.status}).`)
  return response.arrayBuffer()
}
