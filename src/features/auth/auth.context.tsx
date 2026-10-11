/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AdminUser, AuthState, LoginCredentials } from '@/types'
import { IS_MOCK_MODE } from '@/constants'
import { storeToken, clearToken, getStoredToken } from '@/services/api/client'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const MOCK_ADMIN: AdminUser = {
  id: 'u4',
  email: 'admin01@trekviet.vn',
  name: 'Admin TrekViệt',
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: '2023-12-01T00:00:00Z',
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = getStoredToken()
      if (!token) {
        setState({ user: null, isAuthenticated: false, isLoading: false })
        return
      }
      if (IS_MOCK_MODE) {
        const savedUser = sessionStorage.getItem('trekviet_mock_user') || localStorage.getItem('trekviet_mock_user')
        if (savedUser) {
          setState({ user: JSON.parse(savedUser), isAuthenticated: true, isLoading: false })
        } else {
          clearToken()
          setState({ user: null, isAuthenticated: false, isLoading: false })
        }
        return
      }
      try {
        const res = await apiClient.get<{ data: AdminUser }>(ENDPOINTS.AUTH_ME)
        const user = res.data.data
        if (user.role !== 'ADMIN') throw new Error('Forbidden')
        setState({ user, isAuthenticated: true, isLoading: false })
      } catch {
        clearToken()
        setState({ user: null, isAuthenticated: false, isLoading: false })
      }
    }
    checkSession()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials, remember = false) => {
    if (IS_MOCK_MODE) {
      await sleep(800)
      if (credentials.email === 'admin@trekviet.vn' && credentials.password === 'admin123') {
        const user = MOCK_ADMIN
        const fakeToken = 'mock_token_' + Date.now()
        storeToken(fakeToken, remember)
        if (remember) {
          localStorage.setItem('trekviet_mock_user', JSON.stringify(user))
        } else {
          sessionStorage.setItem('trekviet_mock_user', JSON.stringify(user))
        }
        setState({ user, isAuthenticated: true, isLoading: false })
        return
      }
      throw new Error('Email hoặc mật khẩu không đúng')
    }

    const res = await apiClient.post<{ data: { accessToken: string; user: AdminUser } }>(
      ENDPOINTS.AUTH_LOGIN,
      credentials
    )
    const { accessToken, user } = res.data.data
    if (user.role !== 'ADMIN') {
      throw new Error('Tài khoản không có quyền truy cập Admin')
    }
    if (user.status === 'BLOCKED') {
      throw new Error('Tài khoản đã bị khóa')
    }
    storeToken(accessToken, remember)
    setState({ user, isAuthenticated: true, isLoading: false })
  }, [])

  const logout = useCallback(async () => {
    if (!IS_MOCK_MODE) {
      try {
        await apiClient.post(ENDPOINTS.AUTH_LOGOUT)
      } catch {
        // ignore
      }
    }
    clearToken()
    sessionStorage.removeItem('trekviet_mock_user')
    localStorage.removeItem('trekviet_mock_user')
    setState({ user: null, isAuthenticated: false, isLoading: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
