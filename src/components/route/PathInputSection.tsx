import { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import type { GeoLineString } from '@/types'

interface PathInputSectionProps {
  value?: GeoLineString | null
  onChange: (path: GeoLineString | null) => void
  onError?: (error: string) => void
}

export default function PathInputSection({ value, onChange, onError }: PathInputSectionProps) {
  const [inputMode, setInputMode] = useState<'file' | 'json'>('file')
  const [jsonText, setJsonText] = useState('')
  const [parseError, setParseError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()

      // Try to parse as GeoJSON
      if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
        const data = JSON.parse(text)

        // Handle FeatureCollection
        if (data.type === 'FeatureCollection' && data.features?.[0]) {
          const geometry = data.features[0].geometry
          if (geometry.type === 'LineString') {
            onChange(geometry as GeoLineString)
            setParseError('')
            return
          }
        }

        // Handle LineString directly
        if (data.type === 'LineString' && Array.isArray(data.coordinates)) {
          onChange(data as GeoLineString)
          setParseError('')
          return
        }

        throw new Error('File phải chứa LineString hoặc FeatureCollection với LineString')
      }

      // Handle GPX (basic parsing)
      if (file.name.endsWith('.gpx')) {
        const coords = parseGPX(text)
        if (coords.length < 2) {
          throw new Error('GPX phải có ít nhất 2 điểm')
        }
        onChange({
          type: 'LineString',
          coordinates: coords,
        })
        setParseError('')
        return
      }

      throw new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận .geojson, .json, .gpx')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể đọc file'
      setParseError(message)
      onError?.(message)
      onChange(null)
    }
  }

  const handleJsonChange = (text: string) => {
    setJsonText(text)
    setParseError('')

    if (!text.trim()) {
      onChange(null)
      return
    }

    try {
      const data = JSON.parse(text)

      if (data.type !== 'LineString') {
        throw new Error('JSON phải có type = "LineString"')
      }

      if (!Array.isArray(data.coordinates) || data.coordinates.length < 2) {
        throw new Error('coordinates phải là array với ít nhất 2 điểm')
      }

      // Validate each coordinate
      for (const coord of data.coordinates) {
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new Error('Mỗi coordinate phải là [longitude, latitude]')
        }
        const [lng, lat] = coord
        if (typeof lng !== 'number' || typeof lat !== 'number') {
          throw new Error('Tọa độ phải là số')
        }
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          throw new Error('Tọa độ không hợp lệ')
        }
      }

      onChange(data as GeoLineString)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'JSON không hợp lệ'
      setParseError(message)
      onError?.(message)
    }
  }

  const parseGPX = (gpxText: string): [number, number][] => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(gpxText, 'text/xml')
    const trkpts = xmlDoc.querySelectorAll('trkpt')

    const coords: [number, number][] = []
    trkpts.forEach((pt) => {
      const lat = parseFloat(pt.getAttribute('lat') || '0')
      const lon = parseFloat(pt.getAttribute('lon') || '0')
      if (lat && lon) {
        coords.push([lon, lat]) // GeoJSON uses [lng, lat]
      }
    })

    return coords
  }

  const clearPath = () => {
    onChange(null)
    setJsonText('')
    setParseError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setInputMode('file')}
          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
            inputMode === 'file'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border hover:bg-muted'
          }`}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setInputMode('json')}
          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
            inputMode === 'json'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border hover:bg-muted'
          }`}
        >
          <FileText className="w-4 h-4 inline-block mr-2" />
          Paste JSON
        </button>
        {value && (
          <button
            type="button"
            onClick={clearPath}
            className="ml-auto px-4 py-2 text-sm rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            Xóa Path
          </button>
        )}
      </div>

      {/* File upload mode */}
      {inputMode === 'file' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".geojson,.json,.gpx"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 text-sm border border-border rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Hỗ trợ: GeoJSON (.geojson, .json) hoặc GPX (.gpx)
          </p>
        </div>
      )}

      {/* JSON paste mode */}
      {inputMode === 'json' && (
        <div>
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder={`{\n  "type": "LineString",\n  "coordinates": [\n    [106.163, 11.381],\n    [106.164, 11.383],\n    [106.165, 11.386]\n  ]\n}`}
            className="w-full h-48 px-3 py-2 text-sm font-mono border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Paste GeoJSON LineString. Coordinates: [longitude, latitude]
          </p>
        </div>
      )}

      {/* Error message */}
      {parseError && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{parseError}</p>
        </div>
      )}

      {/* Success info */}
      {value && !parseError && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm text-green-800">
            <strong>✓ Path hợp lệ:</strong> {value.coordinates.length} điểm
          </div>
        </div>
      )}
    </div>
  )
}
