import { useState } from 'react'
import { Upload, Pencil, ExternalLink, Plus, Map, Package } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
} from './useOfflineMaps'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import { ROUTES } from '@/constants'
import type { OfflineMapPackage } from '@/types'

import { PlaceMapsPanel } from './PlaceMapsPanel'

type Tab = 'packages' | 'places'

export default function OfflineMapsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: Tab = searchParams.get('tab') === 'packages' ? 'packages' : 'places'
  const setActiveTab = (tab: Tab) => setSearchParams({ tab })

  // ── Tab 1: Gói bản đồ vùng (OfflineMapPackage) ──────────────────────────
  const { params, setSearch, setStatus, setPage } = useOfflineMapFilters()
  const { data: pageData, isLoading, isError, refetch } = useOfflineMaps(params, activeTab === 'packages')
  const publishMutation = usePublishOfflineMap()
  const [publishTarget, setPublishTarget] = useState<OfflineMapPackage | null>(null)

  const maps = pageData?.data ?? []

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
      {activeTab === 'places' && <PlaceMapsPanel />}

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
