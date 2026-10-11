import { useState } from 'react'
import { MapPin, Clock, TrendingUp, Activity, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ErrorState } from '@/components/feedback/ErrorState'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useJourneys, useJourneyFilters } from './useJourneys'
import type { Journey } from './useJourneys'
import { JourneyDetailDrawer } from './JourneyDetailDrawer'
import { formatDate, formatNumber } from '@/lib/utils'

const JOURNEY_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Hoàn thành',
  PLANNED: 'Dự kiến',
  ACTIVE: 'Đang đi',
  PAUSED: 'Tạm dừng',
  CANCELLED: 'Đã hủy',
}

// Map to StatusBadge's status prop (which drives color automatically)
const JOURNEY_STATUS_MAP: Record<string, string> = {
  COMPLETED: 'APPROVED',   // green
  PLANNED: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PENDING_REVIEW',
  CANCELLED: 'CANCELLED',
}

export default function JourneysPage() {
  const { params, setSearch, setStatus, setUserId, setPage } = useJourneyFilters()
  const { data, isLoading, isFetching, isError, refetch } = useJourneys(params)
  const [selectedId, setSelectedId] = useState('')

  const journeys = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hành trình & Check-in"
        description={`Xem danh sách hành trình của người dùng (${formatNumber(total)} hành trình)`}
        action={<button onClick={() => void refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Làm mới
        </button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={params.search ?? ''}
          onChange={setSearch}
          placeholder="Tìm theo tên hành trình, địa điểm..."
          className="max-w-xs"
        />
        <select aria-label="Trạng thái hành trình" value={params.status ?? ''}
          onChange={(e) => setStatus(e.target.value as Journey['status'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-background">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(JOURNEY_STATUS_LABELS).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>)}
        </select>
        <input aria-label="ID người dùng" value={params.userId ?? ''}
          onChange={(e) => setUserId(e.target.value.trim())} placeholder="Lọc theo ID người dùng"
          className="px-3 py-2 text-sm border border-border rounded-md bg-background" />
      </div>
      <p className="text-xs text-muted-foreground">Tự cập nhật mỗi 10 giây khi đang mở màn hình.</p>

      {/* Content */}
      {isLoading ? (
        <div className="p-5"><TableSkeleton rows={8} /></div>
      ) : isError ? (
        <ErrorState retry={() => void refetch()} />
      ) : journeys.length === 0 ? (
        <EmptyState
          title="Chưa có hành trình nào"
          description="Hành trình đã đồng bộ từ ứng dụng sẽ hiển thị tại đây, kể cả hành trình dự kiến."
        />
      ) : (
        <div className="data-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Hành trình</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Địa điểm</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thống kê</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {journeys.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedId(j.id)} className="font-medium text-primary hover:underline text-left">{j.name}</button>
                      <p className="text-xs text-muted-foreground">User: {j.userId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{j.placeName ?? 'Địa điểm không còn khả dụng'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{j.routeName ?? 'Tuyến đường không còn khả dụng'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {((j.statistics?.distanceMeters ?? 0) / 1000).toFixed(1)} km
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          +{formatNumber(j.statistics?.elevationGain ?? 0)} m
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.round((j.statistics?.durationSeconds ?? 0) / 3600)} giờ
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={JOURNEY_STATUS_MAP[j.status] ?? j.status}
                        label={JOURNEY_STATUS_LABELS[j.status] ?? j.status}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(j.startedAt ?? j.plannedStartAt ?? j.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              page={params.page ?? 1}
              totalPages={totalPages}
              total={total}
              limit={params.limit ?? 10}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
      <JourneyDetailDrawer id={selectedId} onClose={() => setSelectedId('')} />
    </div>
  )
}
