export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type FilterParams = Record<string, string | number | boolean | undefined>

export interface SelectOption {
  value: string
  label: string
}

export type EntityStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED'
