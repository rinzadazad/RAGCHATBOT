import api from './api'
import type { ChatResponse, Conversation, ConversationDetail } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

export const chatService = {
  async sendMessage(
    message: string,
    conversationId?: number,
    modelOverride?: string,
    allowWebSearch?: boolean,
    skipUserMessage?: boolean,
    forceWebSearch?: boolean,
    sourceIds?: number[],
  ): Promise<ChatResponse> {
    const { data } = await api.post<ChatResponse>('/chat', {
      message,
      conversation_id: conversationId ?? null,
      model_override: modelOverride ?? null,
      allow_web_search: allowWebSearch ?? false,
      skip_user_message: skipUserMessage ?? false,
      force_web_search: forceWebSearch ?? false,
      source_ids: sourceIds && sourceIds.length > 0 ? sourceIds : null,
    })
    return data
  },

  streamMessage(
    message: string,
    conversationId?: number,
    modelOverride?: string
  ): EventSource {
    const token = localStorage.getItem('access_token')
    const url = `${BASE_URL}/chat/stream`
    const params = new URLSearchParams({
      message,
      ...(conversationId ? { conversation_id: String(conversationId) } : {}),
      ...(modelOverride ? { model_override: modelOverride } : {}),
    })
    return new EventSource(`${url}?${params}&token=${token}`)
  },

  async getHistory(): Promise<Conversation[]> {
    const { data } = await api.get<Conversation[]>('/chat/history')
    return data
  },

  async getConversation(id: number): Promise<ConversationDetail> {
    const { data } = await api.get<ConversationDetail>(`/chat/${id}`)
    return data
  },

  async renameConversation(id: number, title: string): Promise<Conversation> {
    const { data } = await api.patch<Conversation>(`/chat/${id}/rename`, { title })
    return data
  },

  async deleteConversation(id: number): Promise<void> {
    await api.delete(`/chat/${id}`)
  },

  async deleteAllConversations(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id) => api.delete(`/chat/${id}`)))
  },
}
