import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as agentApi from '@/services/api/agentApi'
import type { Message, LLMProvider, ApprovalStatus } from '@/types'

// ── LLM Providers ─────────────────────────────────────────────────────────

export function useLLMProviders() {
  return useQuery({
    queryKey: ['llm-providers'],
    queryFn: agentApi.getProviders,
    staleTime: 1000 * 60 * 5,
  })
}

// ── Conversations list ─────────────────────────────────────────────────────

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: agentApi.getConversations,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title?: string) => agentApi.createConversation(title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
    onError: () => toast.error('Không thể tạo cuộc trò chuyện mới'),
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => agentApi.deleteConversation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('Đã xóa cuộc trò chuyện')
    },
    onError: () => toast.error('Không thể xóa cuộc trò chuyện'),
  })
}

export function useRenameConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      agentApi.renameConversation(id, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('Đã đổi tên cuộc trò chuyện')
    },
    onError: () => toast.error('Không thể đổi tên'),
  })
}

// ── Active conversation ────────────────────────────────────────────────────

export function useConversationDetail(id: string | null, isThinking: boolean = false) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => agentApi.getConversation(id!),
    enabled: !!id,
    // Poll mỗi 2 giây khi đang thinking để cập nhật real-time
    refetchInterval: isThinking ? 2000 : false,
    // Luôn refetch khi query được enable (khi switch conversation)
    refetchOnMount: true,
    // Đảm bảo refetch khi window focus lại
    refetchOnWindowFocus: true,
    // Giữ staleTime ngắn để đảm bảo data fresh
    staleTime: 1000,
  })
}

// ── Chat state (local messages + streaming UI) ─────────────────────────────

export function useChat(conversationId: string | null, selectedProvider: string) {
  const qc = useQueryClient()
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)

  /** Merge server messages + optimistic local ones.
   *  When a server message has the same id as a local message, we prefer
   *  the server version but carry over `pendingApprovals` from the local
   *  copy in case the server's message history endpoint omits that field.
   *  Also applies resolved approval statuses from localStorage.
   */
  const mergeMessages = useCallback(
    (serverMessages: Message[], resolvedApprovals?: Record<string, ApprovalStatus>): Message[] => {
      const localById = new Map(localMessages.map((m) => [m.id, m]))
      const merged = serverMessages.map((serverMsg) => {
        const localMsg = localById.get(serverMsg.id)

        // Merge pendingApprovals: prefer local if server doesn't have it
        let finalPendingApprovals = serverMsg.pendingApprovals
        if (localMsg?.pendingApprovals?.length && !serverMsg.pendingApprovals?.length) {
          finalPendingApprovals = localMsg.pendingApprovals
        }

        // Update approval status from resolvedApprovals (localStorage)
        if (finalPendingApprovals && resolvedApprovals) {
          finalPendingApprovals = finalPendingApprovals.map(approval => {
            const resolvedStatus = resolvedApprovals[approval.approvalId]
            if (resolvedStatus && resolvedStatus !== approval.status) {
              return { ...approval, status: resolvedStatus }
            }
            return approval
          })
        }

        return {
          ...serverMsg,
          pendingApprovals: finalPendingApprovals
        }
      })

      const serverIds = new Set(serverMessages.map((m) => m.id))
      const extras = localMessages.filter((m) => !serverIds.has(m.id))
      return [...merged, ...extras]
    },
    [localMessages]
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !text.trim() || isThinking) return
      setIsThinking(true)

      // Optimistic user message
      const optimisticUser: Message = {
        id: `opt-user-${Date.now()}`,
        role: 'user',
        contents: [{ type: 'text', text }],
        timestamp: new Date().toISOString(),
      }
      setLocalMessages((prev) => [...prev, optimisticUser])

      try {
        const res = await agentApi.sendMessage({
          conversationId,
          text,
          providerId: selectedProvider !== 'auto' ? selectedProvider : undefined,
        })
        // Replace optimistic message with real user + assistant messages
        setLocalMessages((prev) =>
          prev
            .filter((m) => m.id !== optimisticUser.id)
            .concat([res.userMessage, res.assistantMessage])
        )
        // Force refetch ngay lập tức để đảm bảo data fresh
        await Promise.all([
          qc.refetchQueries({ queryKey: ['conversations'] }),
          qc.refetchQueries({ queryKey: ['conversation', conversationId] })
        ])
      } catch (err) {
        console.error('[useChat] sendMessage error:', err)

        // Kiểm tra xem backend có trả về 500 (đã xử lý xong nhưng có lỗi) hay không
        const is500Error = (err as { response?: { status?: number } }).response?.status === 500

        // Nếu lỗi là timeout/network (gateway cut connection) nhưng backend đã xử lý xong,
        // reload messages từ server để lấy messages thật.
        const isNetworkOrTimeout =
          err instanceof Error &&
          (err.message.includes('timeout') ||
            err.message.includes('Network') ||
            err.message.includes('503') ||
            // AxiosError status
            (err as { response?: { status?: number } }).response?.status === 503 ||
            (err as { response?: { status?: number } }).response?.status === 502 ||
            (err as { response?: { status?: number } }).response?.status === 504 ||
            (err as { code?: string }).code === 'ECONNABORTED')

        if (is500Error || isNetworkOrTimeout) {
          // Backend có thể đã xử lý xong — force refetch conversation để lấy messages thật
          // GIỮ LẠI optimistic message trong khi đang reload
          await qc.refetchQueries({ queryKey: ['conversation', conversationId] })
          // Sau khi reload xong, xóa optimistic message
          setLocalMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id))

          // Thêm error message vào chat
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            contents: [{
              type: 'text',
              text: is500Error
                ? '⚠️ Đã xảy ra lỗi khi xử lý tin nhắn. Tin nhắn của bạn đã được ghi nhận. Đang tải lại...'
                : '⚠️ Phản hồi bị chậm. Đang tải lại tin nhắn...'
            }],
            timestamp: new Date().toISOString(),
          }
          setLocalMessages((prev) => [...prev, errorMessage])

          toast.warning(is500Error ? 'Có lỗi xảy ra. Đang tải lại...' : 'Phản hồi bị chậm. Đang tải lại tin nhắn...')
        } else {
          // Lỗi thực sự (không kết nối được, auth fail, etc.) - GIỮ message và thêm error message
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            contents: [{
              type: 'text',
              text: '❌ Không thể kết nối với AI. Vui lòng kiểm tra kết nối mạng và thử lại.'
            }],
            timestamp: new Date().toISOString(),
          }
          setLocalMessages((prev) => [...prev, errorMessage])
          toast.error('Không thể kết nối với AI. Vui lòng thử lại.')
        }
      } finally {
        setIsThinking(false)
      }
    },
    [conversationId, isThinking, selectedProvider, qc]
  )

  return { localMessages, isThinking, mergeMessages, sendMessage, setLocalMessages }
}

// ── Provider selector state ────────────────────────────────────────────────

export function useProviderSelector(providers: LLMProvider[] | undefined) {
  const [selectedId, setSelectedId] = useState<string>('auto')

  const selected = providers?.find((p) => p.id === selectedId) ?? null
  const canSelect = (p: LLMProvider) => p.status !== 'disabled'

  return { selectedId, setSelectedId, selected, canSelect }
}

// ── Relative time helper ───────────────────────────────────────────────────

export function formatConvTime(isoString: string): string {
  const now = new Date()
  const then = new Date(isoString)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  const tz = 'Asia/Ho_Chi_Minh'

  if (diffMin < 1) return 'Vừa xong'
  if (diffH < 1) return `${diffMin} phút trước`
  if (diffH < 24)
    return then.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  if (diffD === 1) return 'Hôm qua'
  if (diffD < 7) return `${diffD} ngày trước`
  if (diffD < 14) return '1 tuần trước'
  return then.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: tz })
}
