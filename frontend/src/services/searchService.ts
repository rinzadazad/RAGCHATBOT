import api from './api'
import type { SearchResponse } from '@/types'

export const searchService = {
  async searchChats(q: string, page = 1, pageSize = 20): Promise<SearchResponse> {
    const { data } = await api.get<SearchResponse>('/search/chats', {
      params: { q, page, page_size: pageSize },
    })
    return data
  },
}
