import api from './api'
import type { AuthToken, User } from '@/types'

export const authService = {
  async register(name: string, email: string, password: string): Promise<AuthToken> {
    const { data } = await api.post<AuthToken>('/auth/register', { name, email, password })
    return data
  },

  async login(email: string, password: string): Promise<AuthToken> {
    const { data } = await api.post<AuthToken>('/auth/login', { email, password })
    return data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
}
