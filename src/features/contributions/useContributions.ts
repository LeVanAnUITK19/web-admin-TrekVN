import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { mockContributions } from '@/mocks/contributions'
import type { Contribution, ContributionListParams, ReviewContributionPayload } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import { toast } from 'sonner'

// eslint-disable-next-line prefer-const
let mockContributionStore = [...mockContributions]

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchContributions(params: ContributionListParams) {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockContributionStore]
    if (params.type) result = result.filter((c) => c.type === params.type)
    if (params.contributionKind) result = result.filter(c => c.type === 'ROUTE_SUBMISSION' && (c.routeSubmission?.contributionKind ?? 'ROUTE') === params.contributionKind)
    if (params.status) result = result.filter((c) => c.status === params.status)
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.contributor.name.toLowerCase().includes(q) ||
          c.routeSubmission?.suggestedName?.toLowerCase().includes(q) ||
          c.placeSuggestion?.suggestedName?.toLowerCase().includes(q),
      )
    }
    const total = result.length
    const page = params.page ?? 1
    const limit = params.limit ?? DEFAULT_PAGE_SIZE
    return {
      data: result.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }
  // Real: GET /admin/contributions
  const res = await apiClient.get(ENDPOINTS.ADMIN_CONTRIBUTIONS, { params })
  return res.data.data
}

async function fetchContribution(id: string): Promise<Contribution> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const item = mockContributionStore.find((c) => c.id === id)
    if (!item) throw new Error('Không tìm thấy đóng góp')
    return item
  }
  // Real: GET /admin/contributions/:id
  const res = await apiClient.get(ENDPOINTS.ADMIN_CONTRIBUTION(id))
  return res.data.data
}

async function reviewContribution(
  id: string,
  payload: ReviewContributionPayload,
): Promise<Contribution> {
  if (IS_MOCK_MODE) {
    await sleep(700)
    const idx = mockContributionStore.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Không tìm thấy đóng góp')
    const current = mockContributionStore[idx]

    // Simulate concurrent-review 409 conflict
    if (
      current.status !== 'PENDING_REVIEW' &&
      current.status !== 'NEEDS_REVISION' &&
      current.status !== 'DRAFT'
    ) {
      const err = Object.assign(new Error('Đóng góp này đã được Admin khác xử lý.'), {
        status: 409,
      })
      throw err
    }

    const statusMap: Record<string, Contribution['status']> = {
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      NEEDS_REVISION: 'NEEDS_REVISION',
    }
    mockContributionStore[idx] = {
      ...current,
      status: statusMap[payload.decision] ?? current.status,
      adminNote: payload.adminNote,
      reviewedBy: 'admin01',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resultingEntityId:
        payload.decision === 'APPROVED'
          ? payload.resultingRouteId ?? `entity_${Date.now()}`
          : current.resultingEntityId,
    }
    return mockContributionStore[idx]
  }
  // Real: PATCH /admin/contributions/:id/review
  // API note #3: trekking-service uses field "decision" (not "action")
  // decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION"
  const res = await apiClient.patch(ENDPOINTS.ADMIN_CONTRIBUTION_REVIEW(id), {
    decision: payload.decision,
    adminNote: payload.adminNote,
    resultingRouteId: payload.resultingRouteId,
  })
  return res.data.data
}

// ─── Marker review (FR-ADM-21) ────────────────────────────────────────────────

interface MarkerReviewPayload {
  action: 'APPROVE' | 'REJECT'
  adminNote?: string
  resultingMilestoneId?: string
}

async function reviewMarker(
  submissionId: string,
  markerId: string,
  payload: MarkerReviewPayload,
) {
  if (IS_MOCK_MODE) {
    await sleep(500)
    return { id: markerId, reviewStatus: payload.action === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
  }
  // Real: POST /admin/contributions/:submissionId/markers/:markerId/review
  // Note: marker review uses "action" field (new endpoint, different from contribution review)
  const res = await apiClient.post(
    ENDPOINTS.ADMIN_CONTRIBUTION_MARKER_REVIEW(submissionId, markerId),
    payload,
  )
  return res.data.data
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useContributions(params: ContributionListParams) {
  return useQuery({
    queryKey: ['contributions', params],
    queryFn: () => fetchContributions(params),
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
  })
}

export function useContribution(id: string) {
  return useQuery({
    queryKey: ['contribution', id],
    queryFn: () => fetchContribution(id),
    enabled: !!id,
  })
}

export function useReviewContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewContributionPayload }) =>
      reviewContribution(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['contributions'] })
      qc.invalidateQueries({ queryKey: ['contribution', variables.id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error & { status?: number; response?: { status: number } }) => {
      const status = err.status ?? err.response?.status
      if (status === 409) {
        toast.error('Xung đột: Đóng góp này đã được Admin khác xử lý. Dữ liệu sẽ được làm mới.')
        // Refetch to show latest state
        void qc.invalidateQueries({ queryKey: ['contributions'] })
      } else {
        toast.error(err.message)
      }
    },
  })
}

export function useReviewMarker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      submissionId,
      markerId,
      payload,
    }: {
      submissionId: string
      markerId: string
      payload: MarkerReviewPayload
    }) => reviewMarker(submissionId, markerId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['contribution', vars.submissionId] })
      qc.invalidateQueries({ queryKey: ['contribution-markers', vars.submissionId] })
      toast.success(vars.payload.action === 'APPROVE' ? 'Đã duyệt marker' : 'Đã từ chối marker')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useContributionFilters() {
  const [params, setParams] = useState<ContributionListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    type: '',
    status: '',
  })
  return {
    params,
    setSearch: (search: string) => setParams((p) => ({ ...p, search, page: 1 })),
    setType: (type: ContributionListParams['type'], contributionKind: ContributionListParams['contributionKind'] = '') => setParams((p) => ({ ...p, type, contributionKind, page: 1 })),
    setStatus: (status: ContributionListParams['status']) =>
      setParams((p) => ({ ...p, status, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  }
}
