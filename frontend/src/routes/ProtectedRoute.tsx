import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/chat" replace /> : <Outlet />
}
