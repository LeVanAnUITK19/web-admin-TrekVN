import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, AlertCircle, CheckCircle2, X, RefreshCw } from 'lucide-react'
import { AgentProgress } from '@/components/agent/AgentProgress'
import * as agentApi from '@/services/api/agentApi'
import { IS_MOCK_MODE } from '@/constants'
import type { AgentTask, AgentTaskStep } from '@/types'

// Step labels theo thứ tự pipeline backend
const PIPELINE_STEP_LABELS: Record<string, string> = {
  VALIDATE_INPUT:  'Validate BBOX',
  PREPARE_WORKDIR: 'Chuẩn bị thư mục',
  EXTRACT_OSM:     'Download OSM data',
  BUILD_MBTILES:   'Build MBTiles',
  BUILD_TERRAIN:   'Build terrain',
  BUILD_CONTOURS:  'Build contours',
  BUILD_HILLSHADE: 'Build hillshade',
  BUILD_GEOJSON:   'Xuất tuyến và cột mốc',
  BUILD_STYLE:     'Build style.json',
  PACKAGE_ZIP:     'Đóng gói ZIP',
  VALIDATE_ZIP:    'Kiểm tra ZIP',
  // Mock steps
  MOCK_VALIDATE:   'Validate input',
  MOCK_WORKDIR:    'Chuẩn bị thư mục',
  MOCK_OSM:        'Mock OSM data',
  MOCK_MBTILES:    'Mock MBTiles',
  MOCK_STYLE:      'Mock style.json',
  MOCK_MANIFEST:   'Tạo manifest.json',
  MOCK_ZIP:        'Đóng gói ZIP',
}

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 600  // 30 phút, cho phép cắt nguồn PBF khu vực

interface MapBuildProgressProps {
  task: AgentTask
  onComplete: (jobId: string) => void
}

type PollStatus = 'polling' | 'done' | 'failed'

export function MapBuildProgress({ task, onComplete }: MapBuildProgressProps) {
  const [steps, setSteps] = useState<AgentTaskStep[]>([])
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [pollStatus, setPollStatus] = useState<PollStatus>('polling')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string>('')

  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const jobId = task.jobId || task.id  // jobId là MAP-xxx, id cũng MAP-xxx sau fix agentApi

  const stopPolling = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
  }, [])

  const poll = useCallback(async () => {
    attemptsRef.current++
    if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
      stopPolling()
      setPollStatus('failed')
      setErrorMessage('Đã ngừng theo dõi sau 30 phút. Mở lại job để kiểm tra trạng thái xử lý.')
      return
    }

    try {
      // Gọi getMapJob để lấy trạng thái pipeline
      const jobData = await agentApi.getMapJob(jobId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = jobData as any
      const jobStatus: string = raw.status ?? ''
      const prog = raw.progress ?? {}
      const backendSteps: { name: string; status: string }[] = prog.steps ?? []
      const percent: number = prog.percent ?? 0
      const step: string = prog.currentStep ?? ''

      setProgress(percent)
      setCurrentStep(step)

      // Map backend steps → UI steps
      if (backendSteps.length > 0) {
        setSteps(
          backendSteps.map((s) => ({
            label: PIPELINE_STEP_LABELS[s.name] ?? s.name,
            status: s.status === 'DONE'
              ? 'done'
              : s.status === 'FAILED'
              ? 'error'
              : s.status === 'SKIPPED'
              ? 'done'  // treat skipped as done (tool không có)
              : prog.currentStep === s.name
              ? 'active'
              : 'pending',
            timestamp: s.status !== 'pending' ? new Date().toISOString() : undefined,
          }))
        )
      }

      // Terminal statuses
      if (jobStatus === 'PENDING_REVIEW') {
        stopPolling()
        setPollStatus('done')
        setProgress(100)
        setTimeout(() => onComplete(jobId), 800)
        return
      }

      if (jobStatus === 'FAILED') {
        stopPolling()
        setPollStatus('failed')
        const errInfo = raw.error ?? {}
        const msg =
          errInfo.message ||
          (Array.isArray(errInfo.messages) ? errInfo.messages.join('; ') : null) ||
          'Pipeline thất bại. Kiểm tra backend logs.'
        setErrorMessage(msg)
        return
      }

    } catch (err: unknown) {
      // 422 = JOB_FAILED từ get_map_artifact (backend mới)
      // Không break polling vì chúng ta dùng getMapJob chứ không phải getMapArtifact
      console.warn('Poll error:', err)
    }
  }, [jobId, onComplete, stopPolling])

  // Mock mode — chạy animation đơn giản rồi navigate
  useEffect(() => {
    if (!IS_MOCK_MODE) return
    const mockStepNames = Object.keys(PIPELINE_STEP_LABELS).slice(0, 7)
    let i = 0
    const iv = setInterval(() => {
      setSteps(mockStepNames.map((name, idx) => ({
        label: PIPELINE_STEP_LABELS[name],
        status: idx < i ? 'done' : idx === i ? 'active' : 'pending',
      })))
      setProgress(Math.round((i / mockStepNames.length) * 100))
      i++
      if (i > mockStepNames.length) {
        clearInterval(iv)
        setPollStatus('done')
        setTimeout(() => onComplete(jobId), 600)
      }
    }, 1000)
    const et = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => { clearInterval(iv); clearInterval(et) }
  }, [jobId, onComplete])

  // Real mode — poll backend
  useEffect(() => {
    if (IS_MOCK_MODE) return
    // Poll ngay lần đầu
    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)
    elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    return stopPolling
  }, [poll, stopPolling])

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-3xl">
      {/* Left: progress */}
      <div className="lg:col-span-2">
        <div className="bg-muted/30 rounded-lg p-4 border border-border mb-4">
          <div className="flex items-center gap-3 mb-4">
            {pollStatus === 'failed' ? (
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            ) : pollStatus === 'done' ? (
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            )}
            <div>
              <p className="font-medium text-foreground text-sm">{task.name}</p>
              <p className="text-xs text-muted-foreground">{task.jobId}</p>
            </div>
          </div>

          <AgentProgress
            value={progress}
            label={
              pollStatus === 'failed' ? 'Thất bại' :
              pollStatus === 'done'   ? 'Hoàn tất' :
              currentStep ? `Đang xử lý: ${PIPELINE_STEP_LABELS[currentStep] ?? currentStep}` : 'Đang xử lý...'
            }
            variant={pollStatus === 'failed' ? 'error' : 'default'}
            className="mb-4"
          />

          {/* Step list */}
          {steps.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {s.status === 'done'    && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                  {s.status === 'active'  && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />}
                  {s.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />}
                  {s.status === 'error'   && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                  <span className={
                    s.status === 'done'    ? 'text-green-700' :
                    s.status === 'active'  ? 'text-blue-700 font-medium' :
                    s.status === 'error'   ? 'text-red-700' :
                    'text-muted-foreground'
                  }>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error box */}
        {pollStatus === 'failed' && errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Tạo bản đồ thất bại</p>
              <p className="text-xs text-red-700 mt-0.5 font-mono break-all">{errorMessage}</p>
              <p className="text-xs text-red-600 mt-2">
                Kiểm tra lại BBOX, kết nối mạng, và thử tạo lại.
              </p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-red-100 rounded"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </div>

      {/* Right: metadata */}
      <div className="bg-white border border-border rounded-lg p-4 shadow-card h-fit">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Thông tin tác vụ
        </h4>
        <dl className="space-y-2">
          {[
            { label: 'Job ID', value: task.jobId || 'N/A' },
            { label: 'Thời gian chạy', value: formatElapsed(elapsed) },
            { label: 'Địa điểm', value: task.name ? task.name.split(' (')[0] : 'N/A' },
            { label: 'Trạng thái', value:
              pollStatus === 'polling' ? 'Đang xử lý...' :
              pollStatus === 'done'    ? 'Hoàn tất ✓' :
              'Thất bại ✗'
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium text-foreground font-mono">{value}</dd>
            </div>
          ))}
        </dl>

        {pollStatus === 'polling' && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Tự động cập nhật mỗi 3s</span>
          </div>
        )}
      </div>
    </div>
  )
}
