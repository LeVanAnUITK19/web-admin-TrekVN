import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Map, RefreshCw, Settings2 } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import { getProvinceNameById, ROUTES } from '@/constants'
import { usePlacesOfflineMaps } from './useOfflineMaps'

export function PlaceMapsPanel() {
  const [search, setSearch] = useState('')
  const [available, setAvailable] = useState('all')
  const [page, setPage] = useState(1)
  const query = usePlacesOfflineMaps({ search, available, page, limit: 20 })
  return <section aria-label="Bản đồ địa điểm">
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold flex items-center gap-2"><Map className="w-4 h-4" /> Bản đồ theo địa điểm</h2>
        <p className="text-sm text-muted-foreground mt-1">Xem gói bản đồ, cập nhật phiên bản và quản lý quyền tải xuống trên ứng dụng.</p></div>
      <Link to={ROUTES.AGENT_MAP_BUILDER} className="text-sm font-medium text-primary underline">Tạo bản đồ bằng Map Builder</Link>
    </div>
    <div className="flex flex-wrap gap-3 mb-4">
      <SearchInput value={search} onChange={value => { setSearch(value); setPage(1) }} placeholder="Tìm tên địa điểm…" className="w-full sm:w-72" />
      <select aria-label="Trạng thái bản đồ" value={available} onChange={e => { setAvailable(e.target.value); setPage(1) }} className="border rounded-md px-3 py-2 text-sm bg-white">
        <option value="all">Tất cả địa điểm</option><option value="true">Đang cho tải xuống</option><option value="false">Chưa bật tải xuống</option>
      </select>
      <button onClick={() => void query.refetch()} disabled={query.isFetching} className="text-sm border rounded-md px-3 py-2 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Làm mới</button>
    </div>
    <div className="data-table-container">
      {query.isLoading ? <div className="p-5"><TableSkeleton rows={5} /></div> : query.isError ? <ErrorState retry={query.refetch} /> : !query.data?.data.length ? <EmptyState title="Không tìm thấy địa điểm" description="Thử đổi từ khóa hoặc trạng thái bản đồ." /> : <>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 border-b"><tr>{['Địa điểm', 'Bản đồ', 'Phiên bản', 'Dung lượng', 'Mức thu phóng', 'Cập nhật', 'Thao tác'].map(label => <th key={label} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{query.data.data.map(entry => <tr key={entry.placeId} className="hover:bg-muted/20">
            <td className="px-4 py-4"><Link to={`/trekking/places/${entry.placeId}`} className="font-medium hover:text-primary">{entry.placeName}</Link><p className="text-xs text-muted-foreground mt-1">{entry.provinceId ? getProvinceNameById(entry.provinceId) : entry.address || '—'}</p></td>
            <td className="px-4 py-4"><span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${entry.offlineMap.available ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>{entry.offlineMap.available ? 'Đang cho tải' : entry.offlineMap.objectKey ? 'Đã tắt tải' : 'Chưa có file'}</span></td>
            <td className="px-4 py-4 font-mono">{entry.offlineMap.objectKey ? `v${entry.offlineMap.version}` : '—'}</td>
            <td className="px-4 py-4">{entry.offlineMap.sizeBytes ? formatFileSize(entry.offlineMap.sizeBytes) : '—'}</td>
            <td className="px-4 py-4">{entry.offlineMap.minZoom ?? '—'} – {entry.offlineMap.maxZoom ?? '—'}</td>
            <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{formatDateTime(entry.updatedAt)}</td>
            <td className="px-4 py-4"><Link to={`/offline-maps/place/${entry.placeId}`} className="inline-flex items-center gap-1.5 text-primary font-medium whitespace-nowrap"><Settings2 className="w-4 h-4" /> Quản lý</Link></td>
          </tr>)}</tbody>
        </table></div>
        <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} limit={query.data.limit} onPageChange={setPage} />
      </>}
    </div>
  </section>
}
