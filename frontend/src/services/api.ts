import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Guard prevents multiple concurrent 401s from firing multiple reloads
let isRedirectingToLogin = false

// Auth endpoints handle their own 401s inline (e.g. wrong password) —
// they must not trigger the global "session expired" redirect below.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/reset-password']

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => error.config?.url?.includes(path))
    if (error.response?.status === 401 && !isAuthEndpoint && !isRedirectingToLogin) {
      isRedirectingToLogin = true
      // clearAuth() removes access_token AND updates auth-storage (zustand persist key)
      // so on reload ProtectedRoute sees isAuthenticated: false and stays on /login
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
