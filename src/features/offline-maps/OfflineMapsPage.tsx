import { useState } from 'react'
import { Upload, Pencil, ExternalLink, Plus, Map, Package, Search, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import {
  useOfflineMaps,
  usePublishOfflineMap,
  useOfflineMapFilters,
  usePlacesOfflineMaps,
} from './useOfflineMaps'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import { ROUTES, getProvinceNameById } from '@/constants'
import type { OfflineMapPackage, PlaceOfflineMapEntry } from '@/types'

type Tab = 'packages' | 'places'

export default function OfflineMapsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('packages')

  // ── Tab 1: Gói bản đồ vùng (OfflineMapPackage) ──────────────────────────
  const { params, setSearch, setStatus, setPage } = useOfflineMapFilters()
  const { data: pageData, isLoading, isError, refetch } = useOfflineMaps(params)
  const publishMutation = usePublishOfflineMap()
  const [publishTarget, setPublishTarget] = useState<OfflineMapPackage | null>(null)

  const maps = pageData?.data ?? []

  // ── Tab 2: Bản đồ địa điểm (Agent Map Builder) ──────────────────────────
  const [placeSearch, setPlaceSearch] = useState('')
  const [placePage, setPlacePage] = useState(1)
  const {
    data: placeMapData,
    isLoading: placeLoading,
    isError: placeError,
    refetch: placeRefetch,
  } = usePlacesOfflineMaps({ search: placeSearch, page: placePage })

  const placeMaps: PlaceOfflineMapEntry[] = placeMapData?.data ?? []

  const formatBounds = (bounds?: PlaceOfflineMapEntry['offlineMap']['bounds']) => {
    if (!bounds) return '—'
    return `${bounds.minLat.toFixed(3)}°, ${bounds.minLon.toFixed(3)}° → ${bounds.maxLat.toFixed(3)}°, ${bounds.maxLon.toFixed(3)}°`
  }

  const tabCls = (tab: Tab) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    }`

  return (
    <div>
      <PageHeader
        title="Quản lý bản đồ offline"
        description="Quản lý gói bản đồ offline cho ứng dụng TrekViệt"
        action={
          activeTab === 'packages' ? (
            <button
              onClick={() => navigate(ROUTES.OFFLINE_MAPS_CREATE)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm gói bản đồ
            </button>
          ) : null
        }
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border mb-4 gap-1">
        <button className={tabCls('packages')} onClick={() => setActiveTab('packages')}>
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Gói bản đồ vùng
          </span>
        </button>
        <button className={tabCls('places')} onClick={() => setActiveTab('places')}>
          <span className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Bản đồ địa điểm
            {placeMapData?.total ? (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/15 text-primary rounded-full">
                {placeMapData.total}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Tab 1 — Gói bản đồ vùng (OfflineMapPackage)
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'packages' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <SearchInput
              value={params.search ?? ''}
              onChange={setSearch}
              placeholder="Tìm gói bản đồ..."
              className="w-60"
            />
            <select
              value={params.status ?? ''}
              onChange={(e) => setStatus(e.target.value as OfflineMapPackage['status'] | '')}
              className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="DEPRECATED">Lỗi thời</option>
            </select>
          </div>

          <div className="data-table-container">
            {isLoading ? (
              <div className="p-5">
                <TableSkeleton rows={3} />
              </div>
            ) : isError ? (
              <ErrorState retry={refetch} />
            ) : !maps.length ? (
              <EmptyState
                title="Không có gói bản đồ"
                description="Chưa có gói bản đồ vùng nào. Tạo gói đầu tiên bằng nút bên trên."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Tên gói
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Khu vực
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Phiên bản
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Checksum
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Dung lượng
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Trạng thái
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Cập nhật
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {maps.map((map: OfflineMapPackage) => (
                        <tr key={map.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{map.name}</p>
                            {map.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-48">
                                {map.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {map.regionCode ? (
                              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                                {map.regionCode}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              v{map.version}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            {map.checksum ? (
                              <code className="text-xs text-muted-foreground font-mono">
                                {map.checksum.slice(0, 18)}…
                              </code>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Chưa có</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {map.fileSizeBytes ? formatFileSize(map.fileSizeBytes) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={map.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDateTime(map.updatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {map.downloadUrl && (
                                <a
                                  href={map.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                                  title="Tải xuống"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                                title="Chỉnh sửa"
                                onClick={() => navigate(ROUTES.OFFLINE_MAPS_EDIT(map.id))}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {map.status === 'DRAFT' && (
                                <button
                                  onClick={() => setPublishTarget(map)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded transition-colors"
                                  title={!map.downloadUrl ? 'Cần objectKey trước khi publish' : undefined}
                                >
                                  <Upload className="w-3 h-3" /> Publish
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pageData && (
                  <Pagination
                    page={pageData.page}
                    totalPages={pageData.totalPages}
                    total={pageData.total}
                    limit={pageData.limit}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          Tab 2 — Bản đồ địa điểm (Agent Map Builder)
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'places' && (
        <>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>Bản đồ địa điểm</strong> — Các bản đồ offline được gắn trực tiếp vào địa điểm trekking
            bởi <strong>Agent Map Builder</strong>. Khác với gói bản đồ vùng, mỗi bản đồ này thuộc về
            một địa điểm cụ thể và được tải về khi người dùng mở địa điểm đó.
          </div>

          <div className="mb-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={placeSearch}
                onChange={(e) => { setPlaceSearch(e.target.value); setPlacePage(1) }}
                placeholder="Tìm địa điểm..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="data-table-container">
            {placeLoading ? (
              <div className="p-5">
                <TableSkeleton rows={4} />
              </div>
            ) : placeError ? (
              <ErrorState retry={placeRefetch} />
            ) : !placeMaps.length ? (
              <EmptyState
                title="Chưa có bản đồ địa điểm"
                description="Agent Map Builder chưa tạo bản đồ cho địa điểm nào. Vào Agent → Map Builder để khởi tạo."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Địa điểm
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Tỉnh/TP
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Phiên bản
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Dung lượng
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Zoom
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Bounds
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Cập nhật
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {placeMaps.map((entry: PlaceOfflineMapEntry) => (
                        <tr key={entry.placeId} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{entry.placeName}</p>
                            {entry.address && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-48">
                                {entry.address}
                              </p>
                            )}
                            <span
                              className={`text-xs mt-0.5 inline-block ${
                                entry.status === 'ACTIVE'
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {entry.status === 'ACTIVE' ? '● Hoạt động' : '○ ' + entry.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {entry.provinceId ? getProvinceNameById(entry.provinceId) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              v{entry.offlineMap.version}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {entry.offlineMap.sizeBytes
                              ? formatFileSize(entry.offlineMap.sizeBytes)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {entry.offlineMap.minZoom != null && entry.offlineMap.maxZoom != null
                              ? `${entry.offlineMap.minZoom} – ${entry.offlineMap.maxZoom}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                            {formatBounds(entry.offlineMap.bounds)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDateTime(entry.updatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                                title="Xem / Cập nhật bản đồ"
                                onClick={() =>
                                  navigate(`/offline-maps/place/${entry.placeId}`)
                                }
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {placeMapData && placeMapData.totalPages > 1 && (
                  <Pagination
                    page={placeMapData.page}
                    totalPages={placeMapData.totalPages}
                    total={placeMapData.total}
                    limit={placeMapData.limit}
                    onPageChange={setPlacePage}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Confirm publish ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!publishTarget}
        onOpenChange={(open) => {
          if (!open) setPublishTarget(null)
        }}
        title="Publish gói bản đồ"
        description={
          publishTarget
            ? !publishTarget.downloadUrl
              ? `Gói "${publishTarget.name}" chưa có file (objectKey). Hãy cập nhật objectKey trước khi publish.`
              : `Publish gói "${publishTarget.name}" v${publishTarget.version}? Người dùng sẽ thấy phiên bản này ngay.`
            : ''
        }
        confirmLabel="Publish"
        onConfirm={async () => {
          if (publishTarget) {
            await publishMutation.mutateAsync(publishTarget.id)
            setPublishTarget(null)
          }
        }}
        isLoading={publishMutation.isPending}
      />
    </div>
  )
}
