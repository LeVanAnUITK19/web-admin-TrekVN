import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as agentApi from '@/services/api/agentApi'
import type { MapBuilderFormData, AgentTask, MapPublishResult } from '@/types'

export type MapBuilderStep = 'form' | 'processing' | 'result' | 'publish'

export const MAP_WIZARD_STEPS = [
  'Nhập thông tin',
  'Xử lý dữ liệu',
  'Xem kết quả',
  'Duyệt & Lưu',
]

export const MAP_STEP_INDEX: Record<MapBuilderStep, number> = {
  form: 0,
  processing: 1,
  result: 2,
  publish: 3,
}

export function useMapBuilderForm() {
  const [step, setStep] = useState<MapBuilderStep>('form')
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: MapBuilderFormData) => agentApi.createMapJob(data),
    onSuccess: (task) => {
      setCurrentTask(task)
      setStep('processing')
      toast.success(`Đã tạo tác vụ ${task.jobId}`)
    },
    onError: () => toast.error('Không thể tạo tác vụ bản đồ. Vui lòng thử lại.'),
  })

  const reset = () => {
    setStep('form')
    setCurrentTask(null)
  }

  return { step, setStep, currentTask, createMutation, reset }
}

/** Fetch with Bearer authentication before triggering the browser download. */
export async function downloadArtifact(jobId: string, fileName = 'offline-map.zip'): Promise<void> {
  try {
    const data = await agentApi.getMapArtifactFile(jobId)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    toast.error('Không thể tải file về. Vui lòng thử lại.')
  }
}

/**
 * Poll trạng thái job sau khi approve cho đến khi đạt trạng thái cuối.
 * Backend approve() là fire-and-forget (background task), nên cần polling
 * để biết khi nào R2 upload xong và production DB đã cập nhật.
 *
 * Terminal statuses: PUBLISHED, FAILED, REJECTED
 * Intermediate: APPROVED, PUBLISHING, UPLOAD_R2
 */
async function pollUntilPublished(
  jobId: string,
  onStatusChange?: (status: string) => void,
  maxAttempts = 40,
  intervalMs = 3000,
): Promise<MapPublishResult> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))

    const job = await agentApi.getMapJob(jobId)
    const status = (job as unknown as { status?: string }).status ?? ''
    onStatusChange?.(status)

    if (status === 'PUBLISHED') {
      // Lấy thông tin publish từ job data
      const jobData = job as unknown as {
        publish?: { r2?: { objectKey?: string }; productionOfflineMap?: { updatedAt?: string } }
        output?: { fileSizeBytes?: number; metadata?: { version?: number } }
      }
      return {
        objectKey:
          jobData.publish?.r2?.objectKey ??
          `maps/unknown/v1/map.zip`,
        version: jobData.output?.metadata?.version ?? 1,
        sizeBytes: jobData.output?.fileSizeBytes ?? 0,
        publishedAt:
          jobData.publish?.productionOfflineMap?.updatedAt ?? new Date().toISOString(),
      }
    }

    if (status === 'FAILED') {
      throw new Error('Publish thất bại — kiểm tra logs backend')
    }

    if (status === 'REJECTED') {
      throw new Error('Job đã bị từ chối')
    }
  }
  throw new Error('Timeout: publish mất quá 2 phút, kiểm tra backend logs')
}

export function useMapPublish(taskId: string | undefined) {
  const qc = useQueryClient()
  const [publishResult, setPublishResult] = useState<MapPublishResult | null>(null)
  const [publishStatus, setPublishStatus] = useState<string>('')

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error('Thiếu jobId')

      // Bước 1: Gọi approve → backend trả ngay { jobId, status: "PUBLISHING" }
      await agentApi.approveMapJob(taskId)

      // Bước 2: Poll đến khi PUBLISHED hoặc FAILED
      return await pollUntilPublished(taskId, (s) => setPublishStatus(s))
    },
    onSuccess: (result) => {
      setPublishResult(result)
      setPublishStatus('PUBLISHED')
      qc.invalidateQueries({ queryKey: ['agent-tasks'] })
      qc.invalidateQueries({ queryKey: ['map-artifact', taskId] })
      toast.success('Bản đồ đã được xuất bản thành công lên Cloudflare R2')
    },
    onError: (err: Error) => {
      setPublishStatus('FAILED')
      toast.error(`Không thể xuất bản: ${err.message}`)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => agentApi.rejectMapJob(taskId!, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-tasks'] })
      qc.invalidateQueries({ queryKey: ['map-artifact', taskId] })
      toast.success('Đã từ chối bản đồ')
    },
    onError: () => toast.error('Không thể từ chối'),
  })

  return { publishMutation, rejectMutation, publishResult, publishStatus }
}
