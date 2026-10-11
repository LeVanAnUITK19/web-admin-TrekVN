export type UserRole = 'ADMIN' | 'USER'
export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  avatarUrl?: string
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface AuthState {
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
}
