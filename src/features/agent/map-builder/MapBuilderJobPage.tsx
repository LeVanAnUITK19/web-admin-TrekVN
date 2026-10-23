import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Download, CheckSquare, X, ChevronLeft,
  FileArchive, CloudUpload, Loader2, CheckCircle2,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { PageHeader } from '@/components/common/PageHeader'
import { WizardStepper } from '@/components/agent/AgentStepper'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { MapPreview } from '@/components/map/MapPreview'
import { ROUTES } from '@/constants'
import * as agentApi from '@/services/api/agentApi'
import { useMapPublish, downloadArtifact, MAP_WIZARD_STEPS } from './useMapBuilder'
import { cn } from '@/lib/utils'
import { isOutsideBaDenReference } from './mapRegion'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function truncateChecksum(checksum: string): string {
  return checksum.length > 20 ? `${checksum.slice(0, 20)}...` : checksum
}

export default function MapBuilderJobPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  // Fetch real artifact data from backend
  const { data: artifact, isLoading, isError } = useQuery({
    queryKey: ['map-artifact', jobId],
    queryFn: () => agentApi.getMapArtifact(jobId!),
    enabled: !!jobId,
  })

  const { publishMutation, rejectMutation, publishResult, publishStatus } = useMapPublish(jobId)

  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [publishStep, setPublishStep] = useState<'idle' | 'confirm' | 'publishing' | 'done'>('idle')
  const [isDownloading, setIsDownloading] = useState(false)

  if (isLoading) return <div className="p-6"><TableSkeleton /></div>
  if (isError || !artifact) return <ErrorState retry={() => window.location.reload()} />

  // Job đã published nếu có r2ObjectKey hoặc publishedAt từ backend, hoặc publishResult từ mutation
  const isPublished = !!publishResult || !!artifact.r2ObjectKey || !!artifact.publishedAt

  const handlePublishConfirm = async () => {
    setPublishStep('publishing')
    try {
      await publishMutation.mutateAsync()
      setPublishStep('done')
    } catch {
      // lỗi đã được toast trong onError của mutation
      setPublishStep('confirm')
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    await rejectMutation.mutateAsync(rejectReason.trim())
    setShowRejectDialog(false)
    setRejectReason('')
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    await downloadArtifact(jobId!, artifact.fileName)
    setIsDownloading(false)
  }

  const bboxStr = `${artifact.bbox.minLng}, ${artifact.bbox.minLat}, ${artifact.bbox.maxLng}, ${artifact.bbox.maxLat}`
  const r2Preview = `maps/${artifact.placeName.toLowerCase().replace(/\s+/g, '-')}/v${artifact.version}/${artifact.fileName}`

  return (
    <div>
      <button
        onClick={() => navigate(ROUTES.AGENT_TASKS)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      <PageHeader
        title={`Kết quả: ${artifact.placeName}`}
        description={`${artifact.fileName} • ${formatBytes(artifact.sizeBytes)}`}
        action={
          !isPublished ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRejectDialog(true)}
                className="px-4 py-2 text-sm border border-destructive/30 text-destructive rounded-md hover:bg-destructive/5 transition-colors"
              >
                Từ chối
              </button>
              <button
                onClick={() => { setPublishStep('confirm'); setShowPublishDialog(true) }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
              >
                <CheckSquare className="w-4 h-4" /> Duyệt & Lưu
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-2 text-sm text-green-700 font-medium bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
              <CheckCircle2 className="w-4 h-4" /> Đã xuất bản
            </span>
          )
        }
      />

      {/* Stepper */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-card mb-6">
        <WizardStepper steps={MAP_WIZARD_STEPS} activeStep={isPublished ? 3 : 2} />
      </div>

      {/* Success artifact card */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800">Tạo bản đồ thành công</p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-green-700">
            <span>File: <code className="font-mono">{artifact.fileName}</code></span>
            <span>Kích thước: {formatBytes(artifact.sizeBytes)}</span>
            <span>Version: {artifact.version}</span>
          </div>
          <p className="text-xs text-green-600 mt-1 font-mono break-all">
            {truncateChecksum(artifact.checksum)}
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 border border-green-300 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {isDownloading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5" />
          }
          {isDownloading ? 'Đang tải...' : 'Tải về'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Map info ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-border rounded-lg shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">Thông tin bản đồ</h3>
            </div>
            <div className="divide-y divide-border">
              {[
                { label: 'Địa điểm', value: artifact.placeName },
                { label: 'BBOX', value: bboxStr },
                { label: 'Zoom', value: `${artifact.zoomMin}–${artifact.zoomMax}` },
                { label: 'Lớp dữ liệu', value: artifact.layers.join(', ') },
                { label: 'Ngày tạo', value: new Date(artifact.createdAt).toLocaleString('vi-VN') },
                ...(publishResult ? [
                  { label: 'Object Key', value: publishResult.objectKey },
                  { label: 'Xuất bản lúc', value: new Date(publishResult.publishedAt).toLocaleString('vi-VN') },
                ] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex px-5 py-3 gap-4">
                  <dt className="w-32 text-xs font-medium text-muted-foreground flex-shrink-0">{label}</dt>
                  <dd className="text-sm text-foreground font-mono break-all">{value}</dd>
                </div>
              ))}
            </div>
          </div>

          {/* Layers toggle (UI only) */}
          <div className="bg-white border border-border rounded-lg shadow-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Lớp bản đồ</h3>
            <div className="flex flex-wrap gap-2">
              {artifact.layers.map((l) => (
                <span key={l} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20">
                  ✓ {l}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Map preview ───────────────────────── */}
        <div className="space-y-4">
          {isOutsideBaDenReference(artifact.placeName, artifact.bbox) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
              <p className="font-semibold mb-1">Vùng cắt không khớp Bà Đen trong gói mẫu</p>
              <p>Tên gói là nhãn; bản đồ hiển thị theo BBOX đã cắt. Để tạo vùng Bà Đen, dùng BBOX: 106.13943, 11.36157, 106.19162, 11.41239.</p>
              <button onClick={() => navigate(ROUTES.AGENT_MAP_BUILDER)} className="mt-2 font-medium underline">Tạo lại bản đồ với vùng đúng</button>
            </div>
          )}
          <MapPreview
            jobId={jobId!}
            checksum={artifact.checksum}
            fileName={artifact.fileName}
            bbox={artifact.bbox}
            placeName={artifact.placeName}
          />

          {/* Publish info (after publish) */}
          {publishResult && (
            <div className="bg-white border border-green-200 rounded-lg shadow-card p-4">
              <h4 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Đã xuất bản lên Cloudflare R2
              </h4>
              <dl className="space-y-1.5 text-xs">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-20">Object Key</dt>
                  <dd className="font-mono text-foreground break-all">{publishResult.objectKey}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-20">Version</dt>
                  <dd className="font-medium">{publishResult.version}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-20">Size</dt>
                  <dd>{formatBytes(publishResult.sizeBytes)}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* ── Publish dialog ──────────────────────────────────────────────── */}
      <Dialog.Root open={showPublishDialog} onOpenChange={(o) => { if (!o) setShowPublishDialog(false) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="font-semibold text-foreground">Duyệt và xuất bản</Dialog.Title>
              {publishStep === 'idle' || publishStep === 'confirm' ? (
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
                </Dialog.Close>
              ) : null}
            </div>

            {publishStep === 'confirm' && (
              <>
                {/* File info */}
                <div className="bg-muted/40 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-3">
                    <FileArchive className="w-8 h-8 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{artifact.fileName}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(artifact.sizeBytes)}</p>
                    </div>
                  </div>
                </div>

                {/* Publish details */}
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Địa điểm', value: artifact.placeName },
                    { label: 'BBOX', value: bboxStr },
                    { label: 'Zoom', value: `${artifact.zoomMin}–${artifact.zoomMax}` },
                    { label: 'Phạm vi', value: artifact.scope },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3 text-sm">
                      <span className="w-24 text-muted-foreground text-xs flex-shrink-0">{label}</span>
                      <span className="text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                {/* R2 preview */}
                <div className="bg-muted/40 rounded p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CloudUpload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Xuất bản lên Cloudflare R2</span>
                  </div>
                  <code className="text-xs text-foreground font-mono break-all">{r2Preview}</code>
                </div>

                {/* Confirmation notes */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-xs text-blue-800 space-y-1">
                  <p className="font-medium">Sau khi xác nhận:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                    <li>map.zip sẽ được upload lên Cloudflare R2</li>
                    <li>metadata offlineMap của địa điểm sẽ được cập nhật</li>
                    <li>File sẽ sẵn sàng cho ứng dụng tải xuống</li>
                  </ol>
                </div>

                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted">Hủy</button>
                  </Dialog.Close>
                  <button
                    onClick={handlePublishConfirm}
                    disabled={publishMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
                  >
                    <CloudUpload className="w-4 h-4" />
                    Duyệt & Xuất bản
                  </button>
                </div>
              </>
            )}

            {publishStep === 'publishing' && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <div className="space-y-3 w-full">
                  {[
                    {
                      label: 'Approving job...',
                      done: ['PUBLISHING', 'UPLOAD_R2', 'PUBLISHED'].includes(publishStatus),
                      active: publishStatus === '' || publishStatus === 'APPROVED',
                    },
                    {
                      label: 'Uploading to Cloudflare R2...',
                      done: publishStatus === 'PUBLISHED',
                      active: ['PUBLISHING', 'UPLOAD_R2'].includes(publishStatus),
                    },
                    {
                      label: 'Cập nhật Trekking Service...',
                      done: publishStatus === 'PUBLISHED',
                      active: publishStatus === 'UPLOAD_R2',
                    },
                    {
                      label: 'Hoàn tất',
                      done: publishStatus === 'PUBLISHED',
                      active: false,
                    },
                  ].map(({ label, done, active }) => (
                    <div key={label} className="flex items-center gap-3">
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        : active
                          ? <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                          : <div className="w-4 h-4 rounded-full bg-muted border border-border flex-shrink-0" />
                      }
                      <span className={cn(
                        'text-sm',
                        done ? 'text-green-700 font-medium' :
                        active ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}>{label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Trạng thái: <span className="font-mono font-medium">{publishStatus || 'PROCESSING...'}</span>
                </p>
              </div>
            )}

            {publishStep === 'done' && publishResult && (
              <div className="py-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-foreground mb-1">Xuất bản thành công!</p>
                <p className="text-xs text-muted-foreground font-mono break-all mb-4">{publishResult.objectKey}</p>
                <button
                  onClick={() => setShowPublishDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md"
                >
                  Đóng
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Reject dialog */}
      <Dialog.Root open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="font-semibold text-foreground">Từ chối bản đồ</Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
              </Dialog.Close>
            </div>
            <label className="form-label block mb-1">Lý do từ chối</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="VD: BBOX không chính xác, thiếu dữ liệu terrain..."
              className="w-full px-3 py-2 text-sm border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-4"
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted">Hủy</button>
              </Dialog.Close>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Đang xử lý...' : 'Từ chối'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
