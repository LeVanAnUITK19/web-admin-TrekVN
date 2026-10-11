import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { mockUsers } from '@/mocks/users'
import type { User, UserListParams } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import { toast } from 'sonner'

// In-memory mock store
// eslint-disable-next-line prefer-const
let mockUserStore = [...mockUsers]
let nextUserId = mockUserStore.length + 1

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchUsers(params: UserListParams) {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockUserStore]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    }
    if (params.status) result = result.filter((u) => u.status === params.status)
    if (params.role) result = result.filter((u) => u.role === params.role)
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
  // Real: GET /admin/users
  const res = await apiClient.get(ENDPOINTS.ADMIN_USERS, { params })
  return res.data.data
}

async function fetchUser(id: string): Promise<User> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const user = mockUserStore.find((u) => u.id === id)
    if (!user) throw new Error('Không tìm thấy người dùng')
    return user
  }
  // Real: GET /admin/users/:id
  const res = await apiClient.get(ENDPOINTS.ADMIN_USER(id))
  return res.data.data
}

async function createUser(data: {
  name: string
  email: string
  password: string
  role: User['role']
  status: User['status']
  username?: string
  bio?: string
}): Promise<User> {
  if (IS_MOCK_MODE) {
    await sleep(600)
    const user: User = {
      id: `u${++nextUserId}`,
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
      bio: data.bio,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalJourneys: 0,
      totalCheckins: 0,
      totalContributions: 0,
    }
    mockUserStore.push(user)
    return user
  }
  // Real: POST /admin/users
  const res = await apiClient.post(ENDPOINTS.ADMIN_USERS, data)
  return res.data.data
}

async function updateUser(
  id: string,
  data: { displayName?: string; bio?: string },
): Promise<User> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    const idx = mockUserStore.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error('Không tìm thấy người dùng')
    mockUserStore[idx] = {
      ...mockUserStore[idx],
      name: data.displayName ?? mockUserStore[idx].name,
      bio: data.bio ?? mockUserStore[idx].bio,
      updatedAt: new Date().toISOString(),
    }
    return mockUserStore[idx]
  }
  // Real: PATCH /admin/users/:id
  const res = await apiClient.patch(ENDPOINTS.ADMIN_USER(id), data)
  return res.data.data
}

async function blockUser(id: string, reason?: string): Promise<User> {
  if (IS_MOCK_MODE) {
    await sleep(500)
    const idx = mockUserStore.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error('Người dùng không tồn tại')
    if (mockUserStore[idx].role === 'ADMIN') throw new Error('Không thể khóa tài khoản Admin')
    mockUserStore[idx] = { ...mockUserStore[idx], status: 'BLOCKED' }
    return mockUserStore[idx]
  }
  // Real: POST /admin/users/:id/block  (body: { reason })
  const res = await apiClient.post(ENDPOINTS.ADMIN_USER_BLOCK(id), {
    reason: reason ?? 'Vi phạm điều khoản sử dụng',
  })
  return res.data.data
}

async function unblockUser(id: string): Promise<User> {
  if (IS_MOCK_MODE) {
    await sleep(500)
    const idx = mockUserStore.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error('Người dùng không tồn tại')
    mockUserStore[idx] = { ...mockUserStore[idx], status: 'ACTIVE' }
    return mockUserStore[idx]
  }
  // Real: POST /admin/users/:id/unblock
  const res = await apiClient.post(ENDPOINTS.ADMIN_USER_UNBLOCK(id))
  return res.data.data
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => fetchUsers(params),
    placeholderData: (prev) => prev,
    refetchInterval: 30000,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
    refetchInterval: 30000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Đã tạo người dùng mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { displayName?: string; bio?: string } }) =>
      updateUser(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', vars.id] })
      toast.success('Đã cập nhật thông tin người dùng')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useBlockUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => blockUser(id, reason),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', vars.id] })
      toast.success('Đã khóa tài khoản người dùng')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUnblockUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => unblockUser(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', id] })
      toast.success('Đã mở khóa tài khoản người dùng')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUserFilters() {
  const [params, setParams] = useState<UserListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: '',
    role: '',
  })
  return {
    params,
    setSearch: (search: string) => setParams((p) => ({ ...p, search, page: 1 })),
    setStatus: (status: UserListParams['status']) => setParams((p) => ({ ...p, status, page: 1 })),
    setRole: (role: UserListParams['role']) => setParams((p) => ({ ...p, role, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  }
}
