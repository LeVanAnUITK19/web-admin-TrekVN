import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { API_BASE_URL, API_VERSION } from '@/constants'

const TOKEN_KEY = 'trekviet_access_token'

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY)
}

export function storeToken(token: string, persistent = false): void {
  clearToken()
  if (persistent) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
  timeout: 15000,
  withCredentials: true, // required for HttpOnly refreshToken cookie
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — attach Bearer token ──────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor — silent token refresh on 401 ────────────────────
// Tracks whether a refresh is already in-flight so concurrent 401s don't
// trigger multiple refresh requests.
let refreshPromise: Promise<string> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (import.meta.env.DEV && error.response) {
      console.error('[API Error]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
      })
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // Only attempt refresh on 401, once per request, and not on the refresh
    // endpoint itself (avoids infinite loop).
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true
      if (!refreshPromise) {
        const persistent = !!localStorage.getItem(TOKEN_KEY)
        // POST /auth/refresh — reads refreshToken from HttpOnly cookie automatically
        refreshPromise = axios.post<{ data: { accessToken: string } }>(
          `${API_BASE_URL}/api/${API_VERSION}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 15000 },
        ).then((res) => {
          const newToken = res.data.data.accessToken
          if (!newToken) throw new Error('Refresh response is missing an access token')
          storeToken(newToken, persistent)
          return newToken
        }).catch((refreshError: unknown) => {
          clearToken()
          window.location.href = '/login'
          throw refreshError
        }).finally(() => {
          refreshPromise = null
        })
      }
      const newToken = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return apiClient(originalRequest)
    }

    return Promise.reject(error)
  },
)

export default apiClient
