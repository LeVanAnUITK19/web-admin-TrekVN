import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_PAGE_SIZE } from '@/constants'
import { getAgentTasks } from '@/services/api/agentApi'
import type { AgentTaskListParams, AgentTaskType, AgentTaskStatus } from '@/types'

export function useAgentTasks(params: AgentTaskListParams) {
  return useQuery({
    queryKey: ['agent-tasks', params],
    queryFn: () => getAgentTasks(params),
    placeholderData: (prev) => prev,
  })
}

export function useAgentTaskFilters() {
  const [params, setParams] = useState<AgentTaskListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    type: '',
    status: '',
    from: '',
    to: '',
  })

  const setSearch = (search: string) => setParams((p) => ({ ...p, search, page: 1 }))
  const setType = (type: AgentTaskType | '') => setParams((p) => ({ ...p, type, page: 1 }))
  const setStatus = (status: AgentTaskStatus | '') => setParams((p) => ({ ...p, status, page: 1 }))
  const setFrom = (from: string) => setParams((p) => ({ ...p, from, page: 1 }))
  const setTo = (to: string) => setParams((p) => ({ ...p, to, page: 1 }))
  const setPage = (page: number) => setParams((p) => ({ ...p, page }))

  return { params, setSearch, setType, setStatus, setFrom, setTo, setPage }
}

// Hook to fetch tab counts dynamically
export function useAgentTaskCounts() {
  const allQuery = useQuery({
    queryKey: ['agent-task-counts', 'all'],
    queryFn: () => getAgentTasks({ page: 1, limit: 1 }),
    select: (data) => data.total || 0,
  })

  const placeQuery = useQuery({
    queryKey: ['agent-task-counts', 'PLACE_BUILDER'],
    queryFn: () => getAgentTasks({ page: 1, limit: 1, type: 'PLACE_BUILDER' }),
    select: (data) => data.total || 0,
  })

  const mapQuery = useQuery({
    queryKey: ['agent-task-counts', 'MAP_BUILDER'],
    queryFn: () => getAgentTasks({ page: 1, limit: 1, type: 'MAP_BUILDER' }),
    select: (data) => data.total || 0,
  })

  const assistantQuery = useQuery({
    queryKey: ['agent-task-counts', 'ASSISTANT'],
    queryFn: () => getAgentTasks({ page: 1, limit: 1, type: 'ASSISTANT' }),
    select: (data) => data.total || 0,
  })

  return {
    all: allQuery.data ?? 0,
    PLACE_BUILDER: placeQuery.data ?? 0,
    MAP_BUILDER: mapQuery.data ?? 0,
    ASSISTANT: assistantQuery.data ?? 0,
    isLoading: allQuery.isLoading || placeQuery.isLoading || mapQuery.isLoading || assistantQuery.isLoading,
  }
}
