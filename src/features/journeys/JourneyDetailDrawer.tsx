import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { formatDateTime } from '@/lib/utils'
import { useJourney } from './useJourneys'

const labels = { PLANNED: 'Dự kiến', ACTIVE: 'Đang đi', PAUSED: 'Tạm dừng', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' }

export function JourneyDetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: journey, isLoading, isError, refetch } = useJourney(id)
  const date = (value?: string) => value ? formatDateTime(value) : '—'
  return <Dialog.Root open={!!id} onOpenChange={(open) => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
      <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-background shadow-xl overflow-y-auto p-6 space-y-5">
        <div className="flex justify-between items-center">
          <Dialog.Title className="text-lg font-semibold">Chi tiết hành trình</Dialog.Title>
          <Dialog.Close asChild><button aria-label="Đóng chi tiết" className="p-2"><X className="w-4 h-4" /></button></Dialog.Close>
        </div>
        <Dialog.Description className="text-sm text-muted-foreground">Dữ liệu từ ứng dụng, tự cập nhật mỗi 10 giây.</Dialog.Description>
        {isLoading ? <p>Đang tải hành trình...</p> : isError ? <ErrorState retry={() => void refetch()} /> : journey && <>
          <h2 className="font-semibold">{journey.name}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt>Người dùng</dt><dd className="break-all">{journey.userId}</dd>
            <dt>Địa điểm</dt><dd>{journey.placeName ?? 'Không còn khả dụng'}</dd>
            <dt>Tuyến đường</dt><dd>{journey.routeName ?? 'Không còn khả dụng'}</dd>
            <dt>Trạng thái</dt><dd>{labels[journey.status]}</dd>
            <dt>Thành viên</dt><dd>{journey.participantCount ?? 1}</dd>
            <dt>Dự kiến bắt đầu</dt><dd>{date(journey.plannedStartAt)}</dd>
            <dt>Dự kiến kết thúc</dt><dd>{date(journey.plannedEndAt)}</dd>
            <dt>Đã bắt đầu</dt><dd>{date(journey.startedAt)}</dd>
            <dt>Hoàn thành</dt><dd>{date(journey.completedAt)}</dd>
            <dt>Quãng đường ghi nhận</dt><dd>{((journey.statistics?.distanceMeters ?? 0) / 1000).toFixed(1)} km</dd>
            <dt>Check-in</dt><dd>{journey.checkinCount}</dd>
            <dt>Điểm đánh dấu</dt><dd>{journey.markerCount}</dd>
            <dt>Cập nhật lúc</dt><dd>{date(journey.updatedAt)}</dd>
          </dl>
          <div><p className="text-sm text-muted-foreground">Ghi chú</p><p className="text-sm whitespace-pre-wrap">{journey.note || '—'}</p></div>
        </>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
