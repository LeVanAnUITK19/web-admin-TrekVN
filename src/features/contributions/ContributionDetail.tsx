import { useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, User, Calendar, MapPin, Route, Tag, FileText, Flag } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ReviewDialog } from './ReviewDialog'
import { SubmittedMarkersPanel } from './SubmittedMarkersPanel'
import { useContribution } from './useContributions'
import { Skeleton } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { CONTRIBUTION_TYPE_LABELS, DIFFICULTY_LABELS } from '@/constants'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Contribution } from '@/types'
import { recordedTrack } from '@/lib/recordedTrack'
import { PlaceOfflineMap } from '@/components/map/PlaceOfflineMap'

type ReviewAction = 'APPROVE' | 'REJECT' | 'NEEDS_REVISION'

interface ContributionDetailProps {
  contributionId: string
  onReviewed: () => void
}

export function ContributionDetail({ contributionId, onReviewed }: ContributionDetailProps) {
  const { data, isLoading, isError, refetch } = useContribution(contributionId)
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null)

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
    </div>
  )

  if (isError) return <ErrorState retry={refetch} className="py-12" />
  if (!data) return null

  const canReview = data.status === 'PENDING_REVIEW' || data.status === 'NEEDS_REVISION'
  const path = data.routeSubmission?.geometry ?? recordedTrack(data.routeSubmission?.encodedPolyline)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">
              {data.routeSubmission?.contributionKind === 'MARKERS' ? 'Đóng góp cột mốc' : CONTRIBUTION_TYPE_LABELS[data.type] ?? data.type}
            </p>
            <h3 className="font-semibold text-foreground text-base">
              {getTitle(data)}
            </h3>
          </div>
          <StatusBadge status={data.status} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Contributor */}
        <InfoSection title="Thông tin đóng góp">
          <InfoRow icon={User} label="Người đóng góp" value={data.contributor.name} />
          <InfoRow icon={Calendar} label="Ngày gửi" value={formatDateTime(data.submittedAt)} />
          {data.reviewedAt && (
            <InfoRow icon={Calendar} label="Ngày duyệt" value={formatDateTime(data.reviewedAt)} />
          )}
          {data.reviewedBy && (
            <InfoRow icon={User} label="Admin duyệt" value={data.reviewedBy} />
          )}
        </InfoSection>

        {/* Route Submission */}
        {data.routeSubmission && (
          <InfoSection title={data.routeSubmission.contributionKind === 'MARKERS' ? 'Nội dung đóng góp cột mốc' : 'Chi tiết đề xuất cung đường'}>
            <InfoRow icon={Route} label="Tên đề xuất" value={data.routeSubmission.suggestedName} />
            {data.routeSubmission.suggestedDescription && (
              <InfoRow icon={FileText} label="Mô tả" value={data.routeSubmission.suggestedDescription} />
            )}
            {data.routeSubmission.notes && <InfoRow icon={AlertCircle} label="Ghi chú an toàn" value={data.routeSubmission.notes} />}
            {data.routeSubmission.sourceJourneyId && <InfoRow icon={Route} label="Hành trình nguồn" value={data.routeSubmission.sourceJourneyId} />}
            {!!data.routeSubmission.distance && (
              <InfoRow icon={MapPin} label="Chiều dài" value={`${data.routeSubmission.distance} km`} />
            )}
            {!!data.routeSubmission.estimatedDuration && (
              <InfoRow icon={Calendar} label="Thời gian hành trình" value={`${Math.floor(data.routeSubmission.estimatedDuration / 60)} giờ ${Math.round(data.routeSubmission.estimatedDuration % 60)} phút`} />
            )}
            {!!data.routeSubmission.elevationGain && (
              <InfoRow icon={MapPin} label="Độ tăng độ cao" value={`${data.routeSubmission.elevationGain} m`} />
            )}
            {path && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">Đường GPS người dùng đã đi · {path.coordinates.length} điểm</p>
                <PlaceOfflineMap placeId={data.routeSubmission.trekkingPlaceId ?? ''}
                  placeName={data.routeSubmission.suggestedName} path={path} className="h-72" />
              </div>
            )}
          </InfoSection>
        )}

        {/* Place Suggestion */}
        {data.placeSuggestion && (
          <InfoSection title="Chi tiết gợi ý địa điểm">
            <InfoRow icon={MapPin} label="Tên địa điểm" value={data.placeSuggestion.suggestedName} />
            <InfoRow icon={MapPin} label="Tỉnh/Thành" value={data.placeSuggestion.province} />
            <InfoRow
              icon={MapPin}
              label="Tọa độ"
              value={`${data.placeSuggestion.coordinates.coordinates[1].toFixed(4)}, ${data.placeSuggestion.coordinates.coordinates[0].toFixed(4)}`}
            />
            {data.placeSuggestion.description && (
              <InfoRow icon={FileText} label="Mô tả" value={data.placeSuggestion.description} />
            )}
            {data.placeSuggestion.difficulty && (
              <InfoRow icon={Tag} label="Độ khó" value={DIFFICULTY_LABELS[data.placeSuggestion.difficulty] ?? data.placeSuggestion.difficulty} />
            )}
            {data.placeSuggestion.tags && data.placeSuggestion.tags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tags</p>
                <div className="flex gap-1 flex-wrap">
                  {data.placeSuggestion.tags.map((t) => (
                    <span key={t} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </InfoSection>
        )}

        {/* Journey Markers – FR-ADM-21 (chỉ hiển thị cho ROUTE_SUBMISSION) */}
        {data.type === 'ROUTE_SUBMISSION' && (
          <InfoSection title={
            <span className="flex items-center gap-1.5">
              <Flag className="w-3 h-3" />
              Cột mốc người dùng gửi ({data.routeSubmission?.markerCount ?? '—'})
            </span>
          }>
            <SubmittedMarkersPanel
              routeSubmissionId={data.id}
              canReview={canReview || data.status === 'APPROVED'}
            />
          </InfoSection>
        )}

        {/* Admin Note */}
        {data.adminNote && (
          <InfoSection title="Ghi chú Admin">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              {data.adminNote}
            </div>
          </InfoSection>
        )}

        {/* Resulting Entity */}
        {data.resultingEntityId && (
          <InfoSection title="Kết quả xử lý">
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
              {data.routeSubmission?.contributionKind === 'MARKERS' ? 'Cung đường tiếp nhận cột mốc: ' : 'Địa điểm / cung đường sau duyệt: '}<code className="font-mono text-xs">{data.resultingEntityId}</code>
            </div>
          </InfoSection>
        )}
      </div>

      {/* Review Actions */}
      {canReview && (
        <div className="px-5 py-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-3">Quyết định duyệt</p>
          <div className="flex gap-2">
            <button
              onClick={() => setReviewAction('APPROVE')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-success hover:bg-success/90 rounded-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Duyệt
            </button>
            <button
              onClick={() => setReviewAction('NEEDS_REVISION')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-warning hover:bg-warning/90 rounded-md transition-colors"
            >
              <AlertCircle className="w-4 h-4" /> Cần sửa
            </button>
            <button
              onClick={() => setReviewAction('REJECT')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md transition-colors"
            >
              <XCircle className="w-4 h-4" /> Từ chối
            </button>
          </div>
        </div>
      )}

      {/* Review Dialog */}
      {reviewAction && (
        <ReviewDialog
          open={!!reviewAction}
          onOpenChange={(open) => { if (!open) setReviewAction(null) }}
          contributionId={contributionId}
          action={reviewAction}
          onSuccess={() => { setReviewAction(null); onReviewed() }}
        />
      )}
    </div>
  )
}

function getTitle(contribution: Contribution): string {
  if (contribution.routeSubmission?.suggestedName) return contribution.routeSubmission.suggestedName
  if (contribution.placeSuggestion?.suggestedName) return contribution.placeSuggestion.suggestedName
  return `#${contribution.id}`
}

function InfoSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{label}: </span>
        <span className="text-sm text-foreground">{value}</span>
      </div>
    </div>
  )
}

// Suppress unused import warning
void cn
