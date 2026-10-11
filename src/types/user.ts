import type { UserRole, UserStatus } from './auth'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  avatarUrl?: string
  phoneNumber?: string
  bio?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  totalJourneys?: number | null
  totalCheckins?: number | null
  totalContributions?: number | null
}

export interface UserListParams {
  page?: number
  limit?: number
  search?: string
  status?: UserStatus | ''
  role?: UserRole | ''
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface BlockUserPayload {
  reason?: string
}
