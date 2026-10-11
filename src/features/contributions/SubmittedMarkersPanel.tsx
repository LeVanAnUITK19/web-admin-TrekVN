/**
 * SubmittedMarkersPanel – FR-ADM-21
 * Hiển thị Journey Markers đính kèm trong route submission,
 * cho phép Admin duyệt / từ chối từng marker.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, MapPin, Mountain, Droplets, Eye, AlertTriangle, Tent, Camera, Landmark, Navigation2, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { IS_MOCK_MODE } from '@/constants'
import { sleep, cn } from '@/lib/utils'
import { mockSubmittedMarkers } from '@/mocks'
import type { SubmittedMarker, SubmittedMarkerReviewStatus, JourneyMarkerType } from '@/types'

// ─── Icon map by marker type ──────────────────────────────────────────────────
const MARKER_ICONS: Record<JourneyMarkerType, React.ElementType> = {
  VIEWPOINT:    Eye,
  REST_POINT:   Navigation2,
  WATER_POINT:  Droplets,
  DANGER:       AlertTriangle,
  INTERSECTION: Navigation2,
  CAMP:         Tent,
  PHOTO_SPOT:   Camera,
  LANDMARK:     Landmark,
  SUMMIT:       Mountain,
  OTHER:        HelpCircle,
}

const MARKER_TYPE_LABELS: Record<JourneyMarkerType, string> = {
  VIEWPOINT:    'Điểm ngắm cảnh',
  REST_POINT:   'Điểm nghỉ ngơi',
  WATER_POINT:  'Nguồn nước',
  DANGER:       'Điểm nguy hiểm',
  INTERSECTION: 'Ngã ba / Ngã tư',
  CAMP:         'Khu cắm trại',
  PHOTO_SPOT:   'Điểm chụp ảnh',
  LANDMARK:     'Điểm mốc',
  SUMMIT:       'Đỉnh núi',
  OTHER:        'Khác',
}

const STATUS_STYLE: Record<SubmittedMarkerReviewStatus, string> = {
  PENDING:  'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<SubmittedMarkerReviewStatus, string> = {
  PENDING:  'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useSubmittedMarkers(routeSubmissionId: string) {
  return useQuery({
    queryKey: ['submitted-markers', routeSubmissionId],
    queryFn: async (): Promise<SubmittedMarker[]> => {
      if (IS_MOCK_MODE) {
        await sleep(300)
        return mockSubmittedMarkers.filter((m) => m.routeSubmissionId === routeSubmissionId)
      }
      const res = await apiClient.get(ENDPOINTS.ADMIN_CONTRIBUTION_MARKERS(routeSubmissionId))
      return res.data.data
    },
    enabled: !!routeSubmissionId,
  })
}

function useReviewMarker(routeSubmissionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      markerId,
      action,
      adminNote,
      resultingMilestoneId,
    }: {
      markerId: string
      action: 'APPROVE' | 'REJECT'
      adminNote?: string
      resultingMilestoneId?: string
    }): Promise<SubmittedMarker> => {
      if (IS_MOCK_MODE) {
        await sleep(400)
        const marker = mockSubmittedMarkers.find((m) => m.id === markerId)
        if (!marker) throw new Error('Không tìm thấy marker')
        const updated: SubmittedMarker = {
          ...marker,
          reviewStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          adminNote,
          resultingMilestoneId,
          updatedAt: new Date().toISOString(),
        }
        // Update in-place (mock)
        const idx = mockSubmittedMarkers.findIndex((m) => m.id === markerId)
        if (idx !== -1) mockSubmittedMarkers[idx] = updated
        return updated
      }
      const res = await apiClient.post(
        ENDPOINTS.ADMIN_CONTRIBUTION_MARKER_REVIEW(routeSubmissionId, markerId),
        { action, adminNote, resultingMilestoneId }
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submitted-markers', routeSubmissionId] })
      toast.success('Đã cập nhật trạng thái marker')
    },
    onError: () => toast.error('Không thể cập nhật marker'),
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface SubmittedMarkersPanelProps {
  routeSubmissionId: string
    /** Cho phép duyệt những cột mốc đang chờ khi đóng góp còn mở hoặc đã được duyệt. */
  canReview?: boolean
}

export function SubmittedMarkersPanel({ routeSubmissionId, canReview = false }: SubmittedMarkersPanelProps) {
  const { data: markers, isLoading, isError, refetch } = useSubmittedMarkers(routeSubmissionId)
  const reviewMutation = useReviewMarker(routeSubmissionId)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2">Đang tải cột mốc...</p>
  }
  if (isError) return <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">Không tải được cột mốc đính kèm. <button onClick={() => refetch()} className="underline font-medium">Thử lại</button></div>

  if (!markers?.length) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Người dùng không đính kèm cột mốc trong đóng góp này.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{markers.length} cột mốc · {markers.filter(m => m.reviewStatus === 'PENDING').length} chờ duyệt. Duyệt cột mốc và duyệt cung đường là hai thao tác riêng.</p>
      {markers.map((marker) => {
        const Icon = MARKER_ICONS[marker.type] ?? MapPin
        const isPending = marker.reviewStatus === 'PENDING'
        const note = noteInputs[marker.id] ?? ''

        return (
          <div
            key={marker.id}
            className={cn(
              'rounded-lg border overflow-hidden',
              marker.reviewStatus === 'APPROVED' ? 'border-green-200' :
              marker.reviewStatus === 'REJECTED' ? 'border-red-200' :
              'border-border'
            )}
          >
            {/* Marker header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
              <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1 truncate">{marker.name}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLE[marker.reviewStatus])}>
                {STATUS_LABEL[marker.reviewStatus]}
              </span>
            </div>

            {/* Marker body */}
            <div className="px-3 py-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{MARKER_TYPE_LABELS[marker.type]}</span>
                {marker.altitude != null && ` · Độ cao: ${marker.altitude} m`}
                {marker.sequence !== undefined && ` · Thứ tự: #${marker.sequence}`}
              </p>
              <p className="text-xs text-muted-foreground">
                📍 {marker.location.coordinates[1].toFixed(5)}, {marker.location.coordinates[0].toFixed(5)}
              </p>
              {marker.description && (
                <p className="text-xs text-foreground">{marker.description}</p>
              )}
              {marker.images && marker.images.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {marker.images.slice(0, 3).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`marker-${i}`}
                      className="w-12 h-12 object-cover rounded border border-border"
                    />
                  ))}
                </div>
              )}
              {marker.resultingMilestoneId && (
                <p className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  ✓ Đã liên kết cột mốc chính thức: <code className="font-mono">{marker.resultingMilestoneId}</code>
                </p>
              )}
              {marker.adminNote && !isPending && (
                <p className="text-xs text-muted-foreground italic">Ghi chú: {marker.adminNote}</p>
              )}
            </div>

            {/* Review actions – only for PENDING markers when contribution can be reviewed */}
            {canReview && isPending && (
              <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                <input
                  type="text"
                  placeholder="Ghi chú Admin (tùy chọn)"
                  className="w-full px-2 py-1.5 text-xs border border-border rounded outline-none focus:ring-1 focus:ring-primary/20"
                  value={note}
                  onChange={(e) => setNoteInputs((n) => ({ ...n, [marker.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewMutation.mutate({
                      markerId: marker.id,
                      action: 'APPROVE',
                      adminNote: note || undefined,
                    })}
                    disabled={reviewMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-white bg-success hover:bg-success/90 rounded disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Duyệt cột mốc
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate({
                      markerId: marker.id,
                      action: 'REJECT',
                      adminNote: note || undefined,
                    })}
                    disabled={reviewMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-white bg-destructive hover:bg-destructive/90 rounded disabled:opacity-60"
                  >
                    <XCircle className="w-3 h-3" /> Từ chối
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
