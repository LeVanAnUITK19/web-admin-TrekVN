import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Mountain, Edit, Image as ImageIcon, Calendar, Database, Map, Download } from 'lucide-react'
import { PlaceOfflineMap } from '@/components/map/PlaceOfflineMap'
import { PageLoader } from '@/components/feedback/PageLoader'
import { ErrorState } from '@/components/feedback/ErrorState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ROUTES, DIFFICULTY_LABELS, getProvinceNameById } from '@/constants'
import { usePlace } from './usePlaces'
import { PlaceReviews } from './PlaceReviews'

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700 border-green-200',
  MODERATE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  HARD: 'bg-orange-100 text-orange-700 border-orange-200',
  EXPERT: 'bg-red-100 text-red-700 border-red-200',
}

const DATA_ORIGIN_LABELS: Record<string, string> = {
  MANUAL: 'Thủ công',
  USER_CONTRIBUTION: 'Đóng góp người dùng',
  AI_AGENT: 'AI Agent',
}

export default function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: place, isLoading, isError, refetch } = usePlace(id!)

  if (isLoading) return <PageLoader />
  if (isError || !place) return <ErrorState retry={refetch} />

  // Handle backend response that might use 'location' instead of 'coordinates'
  const coordinates = place.coordinates || place.location
  const lat = coordinates?.coordinates?.[1]
  const lng = coordinates?.coordinates?.[0]

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '—'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins}m`
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(ROUTES.TREKKING_PLACES)} className="hover:text-primary">
          Địa điểm
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{place.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(ROUTES.TREKKING_PLACES)}
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-foreground">{place.name}</h1>
              <StatusBadge status={place.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {place.provinceId ? getProvinceNameById(place.provinceId) : place.province}
              </span>
              {place.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {place.address}
                </span>
              )}
              {place.ratingAverage !== undefined && place.ratingCount !== undefined && (
                <span className="flex items-center gap-1">
                  ⭐ {place.ratingAverage.toFixed(1)} ({place.ratingCount} đánh giá)
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(ROUTES.TREKKING_PLACES_EDIT(place.id))}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
        >
          <Edit className="w-4 h-4" /> Chỉnh sửa
        </button>
      </div>

      {/* Cover image strip */}
      {place.images && place.images.length > 0 && (
        <div className={`mb-6 rounded-xl overflow-hidden border border-border ${
          place.images.length === 1
            ? ''
            : 'grid gap-0.5 h-72'
        } ${
          place.images.length === 2
            ? 'grid-cols-2'
            : place.images.length >= 3
            ? 'grid-cols-4'
            : ''
        }`}>
          {place.images.length === 1 ? (
            /* 1 ảnh: hiển thị tự nhiên, không ép chiều cao cố định */
            <a
              href={place.images[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden group rounded-xl"
            >
              <img
                src={place.images[0]}
                alt={place.name}
                className="w-full max-h-96 object-contain bg-slate-100 transition-transform group-hover:scale-105"
              />
            </a>
          ) : (
            <>
              {/* Ảnh lớn bên trái */}
              <a
                href={place.images[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block overflow-hidden group col-span-2 row-span-2"
              >
                <img
                  src={place.images[0]}
                  alt={place.name}
                  className="w-full h-full object-cover object-center transition-transform group-hover:scale-105"
                />
              </a>
              {/* Ảnh nhỏ bên phải (tối đa 4 ảnh phụ) */}
              {place.images.slice(1, 5).map((img, i) => (
                <a
                  key={i}
                  href={img}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block overflow-hidden group"
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover object-center transition-transform group-hover:scale-105"
                  />
                  {i === 3 && place.images.length > 5 && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                      <span className="text-white font-semibold text-xl">+{place.images.length - 5}</span>
                    </div>
                  )}
                </a>
              ))}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin cơ bản */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Thông tin cơ bản</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Độ khó</label>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-md border ${DIFFICULTY_COLORS[place.difficulty]}`}>
                  {DIFFICULTY_LABELS[place.difficulty]}
                </span>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nguồn dữ liệu</label>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {place.dataOrigin ? DATA_ORIGIN_LABELS[place.dataOrigin] : 'Không xác định'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {place.elevationMeters !== undefined && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Mountain className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Độ cao</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{place.elevationMeters}m</p>
                </div>
              )}
              {place.averageDurationMinutes !== undefined && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Thời gian TB</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{formatDuration(place.averageDurationMinutes)}</p>
                </div>
              )}
              {place.totalRoutes !== undefined && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Map className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Số cung đường</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{place.totalRoutes}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mô tả</label>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {place.description}
                </p>
              </div>

              {place.tags && place.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Tags</label>
                  <div className="flex gap-2 flex-wrap">
                    {place.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tọa độ & Bản đồ */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Vị trí & Bản đồ</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Vĩ độ (Latitude)</label>
                <p className="text-sm font-mono font-medium text-foreground">
                  {lat ? lat.toFixed(6) : '—'}°
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Kinh độ (Longitude)</label>
                <p className="text-sm font-mono font-medium text-foreground">
                  {lng ? lng.toFixed(6) : '—'}°
                </p>
              </div>
            </div>

              <PlaceOfflineMap
                placeId={place.id}
                location={coordinates}
                placeName={place.name}
                className="mb-4"
              />

          </div>

          {place.images && place.images.length > 0 && (
            <div className="bg-white rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Hình ảnh</h2>
                <span className="text-xs text-muted-foreground">{place.images.length} ảnh</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {place.images.map((img, idx) => (
                  <a
                    key={idx}
                    href={img}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden group block"
                  >
                    <img
                      src={img}
                      alt={`${place.name} ${idx + 1}`}
                      className="w-full h-full object-cover object-center transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <PlaceReviews placeId={place.id} />
          {/* External References */}
          {place.externalRefs && Object.keys(place.externalRefs).length > 0 && (
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Tham chiếu ngoài</h2>
              <div className="space-y-2">
                {Object.entries(place.externalRefs).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm font-medium text-muted-foreground uppercase">{key}</span>
                    <span className="text-sm font-mono text-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Offline Map */}
          <div className="bg-white rounded-lg border border-border p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">Bản đồ Offline</h3>

            {place.offlineMap?.available ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trạng thái</span>
                  <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Có sẵn
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Phiên bản</span>
                  <span className="text-sm font-medium text-foreground">v{place.offlineMap.version}</span>
                </div>

                {place.offlineMap.sizeBytes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dung lượng</span>
                    <span className="text-sm font-medium text-foreground">{formatFileSize(place.offlineMap.sizeBytes)}</span>
                  </div>
                )}

                {place.offlineMap.minZoom !== undefined && place.offlineMap.maxZoom !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Zoom</span>
                    <span className="text-sm font-medium text-foreground">
                      {place.offlineMap.minZoom} - {place.offlineMap.maxZoom}
                    </span>
                  </div>
                )}

                {place.offlineMap.checksum && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Checksum</span>
                    <span className="text-xs font-mono text-foreground break-all">
                      {place.offlineMap.checksum}
                    </span>
                  </div>
                )}

                {place.offlineMap.objectKey && (
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors">
                    <Download className="w-4 h-4" />
                    Tải xuống bản đồ
                  </button>
                )}

                {place.offlineMap.bounds && (
                  <div className="pt-3 border-t border-border">
                    <span className="text-xs font-medium text-muted-foreground block mb-2">Giới hạn (Bounds)</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Min Lat:</span>{' '}
                        <span className="font-mono">{place.offlineMap.bounds.minLat.toFixed(4)}°</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Lat:</span>{' '}
                        <span className="font-mono">{place.offlineMap.bounds.maxLat.toFixed(4)}°</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Min Lon:</span>{' '}
                        <span className="font-mono">{place.offlineMap.bounds.minLon.toFixed(4)}°</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Lon:</span>{' '}
                        <span className="font-mono">{place.offlineMap.bounds.maxLon.toFixed(4)}°</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Map className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Chưa có bản đồ offline</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg border border-border p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">Metadata</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ID</label>
                <p className="text-sm font-mono text-foreground">{place.id}</p>
              </div>

              {place.provinceId && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Province ID</label>
                  <p className="text-sm font-mono text-foreground">{place.provinceId}</p>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Ngày tạo</label>
                <div className="flex items-center gap-1 text-sm text-foreground">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {new Date(place.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cập nhật lần cuối</label>
                <div className="flex items-center gap-1 text-sm text-foreground">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {new Date(place.updatedAt).toLocaleString('vi-VN')}
                </div>
              </div>

              {place.lastVerifiedAt && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Xác minh lần cuối</label>
                  <div className="flex items-center gap-1 text-sm text-foreground">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {new Date(place.lastVerifiedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
