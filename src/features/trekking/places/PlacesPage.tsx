import { useState } from 'react'
import { Plus, MoreHorizontal, Eye, Pencil, PowerOff, Power } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { DIFFICULTY_LABELS, ROUTES, getProvinceNameById } from '@/constants'
import { usePlaces, useUpdatePlace, usePlaceFilters } from './usePlaces'
import type { Place } from '@/types'

export default function PlacesPage() {
  const navigate = useNavigate()
  const { params, setSearch, setStatus, setDifficulty, setPage } = usePlaceFilters()
  const { data, isLoading, isError, refetch } = usePlaces(params)
  const updateMutation = useUpdatePlace()
  const [disableTarget, setDisableTarget] = useState<Place | null>(null)
  const [enableTarget, setEnableTarget] = useState<Place | null>(null)

  const handleDisable = async () => {
    if (!disableTarget) return
    await updateMutation.mutateAsync({ id: disableTarget.id, data: { status: 'INACTIVE' } })
    setDisableTarget(null)
  }

  const handleEnable = async () => {
    if (!enableTarget) return
    await updateMutation.mutateAsync({ id: enableTarget.id, data: { status: 'ACTIVE' } })
    setEnableTarget(null)
  }

  return (
    <div>
      <PageHeader
        title="Quản lý địa điểm"
        description="Duyệt, chỉnh sửa và quản lý địa điểm trekking"
        action={
          <button
            onClick={() => navigate(ROUTES.TREKKING_PLACES_CREATE)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm địa điểm
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Tìm địa điểm..." className="w-64" />
        <select value={params.difficulty ?? ''} onChange={(e) => setDifficulty(e.target.value as Place['difficulty'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Tất cả độ khó</option>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={params.status ?? ''} onChange={(e) => setStatus(e.target.value as Place['status'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Không hoạt động</option>
          <option value="DISABLED">Đã vô hiệu</option>
        </select>
      </div>

      <div className="data-table-container">
        {isLoading ? <div className="p-5"><TableSkeleton /></div>
          : isError ? <ErrorState retry={refetch} />
          : !data?.data?.length ? <EmptyState title="Không có địa điểm" />
          : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-8">#</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-16">Ảnh</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tên địa điểm</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tỉnh/TP</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Độ cao</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Độ khó</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nguồn</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Offline Map</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.data.map((place: Place, idx: number) => (
                      <tr key={place.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{(params.page! - 1) * params.limit! + idx + 1}</td>
                        {/* Thumbnail */}
                        <td className="px-4 py-3">
                          {place.images && place.images.length > 0 ? (
                            <div className="w-12 h-9 rounded overflow-hidden border border-border flex-shrink-0">
                              <img
                                src={place.images[0]}
                                alt={place.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-9 rounded bg-muted border border-border flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{place.name}</p>
                          {place.address && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-48">{place.address}</p>
                          )}
                          {place.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {place.tags.slice(0, 2).map((t: string) => (
                                <span key={t} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>
                              ))}
                              {place.tags.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{place.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">
                          {place.provinceId ? getProvinceNameById(place.provinceId) : place.province}
                        </td>
                        <td className="px-4 py-3">
                          {place.elevationMeters ? (
                            <span className="text-xs font-medium text-foreground">{place.elevationMeters}m</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {DIFFICULTY_LABELS[place.difficulty] ?? place.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {place.dataOrigin === 'MANUAL' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Thủ công</span>
                          )}
                          {place.dataOrigin === 'USER_CONTRIBUTION' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">User</span>
                          )}
                          {place.dataOrigin === 'AI_AGENT' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">AI</span>
                          )}
                          {!place.dataOrigin && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {place.offlineMap?.available ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              v{place.offlineMap.version}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Chưa có</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={place.status} /></td>
                        <td className="px-4 py-3">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content align="end" className="z-50 min-w-36 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm">
                                <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none" onSelect={() => navigate(`/trekking/places/${place.id}`)}>
                                  <Eye className="w-4 h-4" /> Xem chi tiết
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none"
                                  onSelect={() => navigate(ROUTES.TREKKING_PLACES_EDIT(place.id))}
                                >
                                  <Pencil className="w-4 h-4" /> Chỉnh sửa
                                </DropdownMenu.Item>
                                {place.status === 'ACTIVE' && (
                                  <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-red-50 text-red-600 outline-none"
                                    onSelect={() => setDisableTarget(place)}>
                                    <PowerOff className="w-4 h-4" /> Vô hiệu hóa
                                  </DropdownMenu.Item>
                                )}
                                {(place.status === 'INACTIVE' || place.status === 'DISABLED') && (
                                  <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-green-50 text-green-600 outline-none"
                                    onSelect={() => setEnableTarget(place)}>
                                    <Power className="w-4 h-4" /> Kích hoạt lại
                                  </DropdownMenu.Item>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} />
            </>
          )}
      </div>

      <ConfirmDialog
        open={!!disableTarget}
        onOpenChange={(open) => { if (!open) setDisableTarget(null) }}
        title="Vô hiệu hóa địa điểm"
        description={`Bạn có chắc muốn vô hiệu hóa địa điểm "${disableTarget?.name}"? Địa điểm sẽ không hiển thị với người dùng.`}
        confirmLabel="Vô hiệu hóa"
        variant="danger"
        onConfirm={handleDisable}
        isLoading={updateMutation.isPending}
      />
      <ConfirmDialog
        open={!!enableTarget}
        onOpenChange={(open) => { if (!open) setEnableTarget(null) }}
        title="Kích hoạt địa điểm"
        description={`Bạn có chắc muốn kích hoạt lại địa điểm "${enableTarget?.name}"?`}
        confirmLabel="Kích hoạt"
        variant="default"
        onConfirm={handleEnable}
        isLoading={updateMutation.isPending}
      />
    </div>
  )
}
