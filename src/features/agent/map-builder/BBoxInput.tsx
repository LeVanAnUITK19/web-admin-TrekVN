import { ExternalLink, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MapBBox } from '@/types'

interface BBoxInputProps {
  value: MapBBox
  onChange: (bbox: MapBBox) => void
  errors?: Partial<Record<keyof MapBBox, string>>
  onPreview?: () => void
}

const BBOX_FIELDS: {
  key: keyof MapBBox
  label: string
  placeholder: string
}[] = [
  { key: 'minLng', label: 'Min Longitude', placeholder: '106.139430' },
  { key: 'minLat', label: 'Min Latitude', placeholder: '11.361570' },
  { key: 'maxLng', label: 'Max Longitude', placeholder: '106.191620' },
  { key: 'maxLat', label: 'Max Latitude', placeholder: '11.412390' },
]

export function BBoxInput({ value, onChange, errors = {}, onPreview }: BBoxInputProps) {
  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono',
      hasErr ? 'border-destructive' : 'border-border'
    )

  const handleChange = (key: keyof MapBBox, raw: string) => {
    const num = parseFloat(raw)
    onChange({ ...value, [key]: isNaN(num) ? 0 : num })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="form-label">Nhập BBOX từ OpenStreetMap</label>
        <a
          href="https://www.openstreetmap.org/export"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Lấy BBOX <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Lấy BBOX từ vùng cần tạo bản đồ trên OpenStreetMap → Export.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {BBOX_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground block mb-1">{label}</label>
            <input
              type="number"
              step="any"
              value={value[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              className={inputCls(!!errors[key])}
            />
            {errors[key] && <p className="form-error">{errors[key]}</p>}
          </div>
        ))}
      </div>

      {/* Preview button */}
      {onPreview && (
        <button
          type="button"
          onClick={onPreview}
          className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
        >
          <Map className="w-3.5 h-3.5" /> Xem trước BBOX
        </button>
      )}

      {/* BBox preview */}
      {value.minLng !== 0 && value.maxLng !== 0 && (
        <BBoxPreview bbox={value} />
      )}
    </div>
  )
}

/** Simple visual BBox preview — rectangle on a placeholder map */
function BBoxPreview({ bbox }: { bbox: MapBBox }) {
  const w = Math.abs(bbox.maxLng - bbox.minLng).toFixed(4)
  const h = Math.abs(bbox.maxLat - bbox.minLat).toFixed(4)
  const centerLat = ((bbox.minLat + bbox.maxLat) / 2).toFixed(4)
  const centerLng = ((bbox.minLng + bbox.maxLng) / 2).toFixed(4)

  return (
    <div className="mt-3 bg-muted/40 border border-border rounded-lg overflow-hidden">
      {/* Mock map area */}
      <div className="relative h-36 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-20">
          {[25, 50, 75].map((p) => (
            <div key={`h${p}`} className="absolute w-full border-t border-gray-400" style={{ top: `${p}%` }} />
          ))}
          {[25, 50, 75].map((p) => (
            <div key={`v${p}`} className="absolute h-full border-l border-gray-400" style={{ left: `${p}%` }} />
          ))}
        </div>
        {/* BBox rectangle */}
        <div className="absolute border-2 border-primary bg-primary/10 rounded"
          style={{ top: '20%', left: '20%', right: '20%', bottom: '20%' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow" />
          </div>
        </div>
        <span className="absolute top-2 right-2 text-xs text-muted-foreground bg-white/80 px-1.5 py-0.5 rounded">
          Xem trước BBOX
        </span>
      </div>
      {/* Info row */}
      <div className="px-3 py-2 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 bg-white">
        <span>Center: {centerLat}, {centerLng}</span>
        <span>W: {w}° × H: {h}°</span>
        <a
          href={`https://www.openstreetmap.org/#map=13/${centerLat}/${centerLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-1"
        >
          Mở full map <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
