import api from './api'
import type { Settings, ModelInfo } from '@/types'

export const settingsService = {
  async get(): Promise<Settings> {
    const { data } = await api.get<Settings>('/settings')
    return data
  },

  async update(settings: Partial<Settings>): Promise<Settings> {
    const { data } = await api.put<Settings>('/settings', settings)
    return data
  },

  async getModels(): Promise<ModelInfo[]> {
    const { data } = await api.get<{ models: ModelInfo[] }>('/settings/models')
    return data.models
  },
}
