import { useEffect, useRef } from 'react'
import maplibregl, { Map as MapLibreMap, LngLatBounds } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin } from 'lucide-react'

export interface BBoxPreviewProps {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
  placeName?: string
  className?: string
}

/**
 * Compact BBOX preview component - shows coverage area on mini map
 * Used in forms before submitting map creation
 */
export function BBoxPreview({
  minLng,
  minLat,
  maxLng,
  maxLat,
  placeName,
  className,
}: BBoxPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)

  // Validate BBOX
  const isValid =
    minLng !== 0 &&
    maxLng !== 0 &&
    minLat !== 0 &&
    maxLat !== 0 &&
    minLng < maxLng &&
    minLat < maxLat

  useEffect(() => {
    if (!mapContainer.current || !isValid || map.current) return

    const centerLng = (minLng + maxLng) / 2
    const centerLat = (minLat + maxLat) / 2

    const newMap = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [centerLng, centerLat],
      zoom: 10,
      interactive: false, // Disable user interaction for preview
    })

    map.current = newMap

    newMap.on('load', () => {
      // Add BBOX
      newMap.addSource('bbox-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat],
            ]],
          },
        },
      })

      newMap.addLayer({
        id: 'bbox-fill',
        type: 'fill',
        source: 'bbox-source',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.2,
        },
      })

      newMap.addLayer({
        id: 'bbox-outline',
        type: 'line',
        source: 'bbox-source',
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
        },
      })

      // Fit to BBOX
      const bounds = new LngLatBounds([minLng, minLat], [maxLng, maxLat])
      newMap.fitBounds(bounds, { padding: 20, duration: 0 })
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [minLng, minLat, maxLng, maxLat, isValid])

  if (!isValid) {
    return (
      <div className={`h-48 bg-muted/30 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-center p-4 ${className}`}>
        <MapPin className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">
          Nhập BBOX hợp lệ để xem preview
        </p>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-border ${className}`}>
      <div ref={mapContainer} className="h-48 w-full" />
      {placeName && (
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded px-2 py-1 shadow-sm">
          <p className="text-xs font-medium text-foreground">{placeName}</p>
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded px-2 py-1 shadow-sm">
        <p className="text-[10px] font-mono text-muted-foreground">
          {minLat.toFixed(3)}, {minLng.toFixed(3)} → {maxLat.toFixed(3)}, {maxLng.toFixed(3)}
        </p>
      </div>
    </div>
  )
}
