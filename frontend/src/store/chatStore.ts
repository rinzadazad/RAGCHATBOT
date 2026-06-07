import { create } from 'zustand'
import type { Conversation, Message, RetrievedChunk } from '@/types'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: number | null
  messages: Message[]
  streamingMessage: string
  isStreaming: boolean
  lastChunks: RetrievedChunk[]
  lastDebugInfo: {
    promptTokens: number
    completionTokens: number
    responseTimeMs: number
    retrievalChunks: RetrievedChunk[]
  } | null
  showDebugPanel: boolean

  setConversations: (convs: Conversation[]) => void
  setActiveConversation: (id: number | null) => void
  setActiveConversationId: (id: number) => void
  setMessages: (msgs: Message[]) => void
  appendMessage: (msg: Message) => void
  setStreamingMessage: (text: string) => void
  appendStreamToken: (token: string) => void
  setIsStreaming: (v: boolean) => void
  setLastDebugInfo: (info: ChatState['lastDebugInfo']) => void
  toggleDebugPanel: () => void
  updateConversationTitle: (id: number, title: string) => void
  removeConversation: (id: number) => void
  addConversation: (conv: Conversation) => void
  resetChatStore: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  streamingMessage: '',
  isStreaming: false,
  lastChunks: [],
  lastDebugInfo: null,
  showDebugPanel: false,

  setConversations: (convs) => set({ conversations: convs }),
  setActiveConversation: (id) => set({ activeConversationId: id, messages: [], streamingMessage: '' }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setMessages: (msgs) => set({ messages: msgs }),
  appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setStreamingMessage: (text) => set({ streamingMessage: text }),
  appendStreamToken: (token) => set((s) => ({ streamingMessage: s.streamingMessage + token })),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setLastDebugInfo: (info) => set({ lastDebugInfo: info }),
  toggleDebugPanel: () => set((s) => ({ showDebugPanel: !s.showDebugPanel })),
  updateConversationTitle: (id, title) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    })),
  removeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    })),
  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),
  resetChatStore: () =>
    set({
      conversations: [],
      activeConversationId: null,
      messages: [],
      streamingMessage: '',
      isStreaming: false,
      lastChunks: [],
      lastDebugInfo: null,
    }),
}))
