import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot, RefreshCw, Bug, Loader2, Globe, X, BookOpen, FileText, Type, ChevronDown, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { MessageInput } from '@/components/chat/MessageInput'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { RagDebugPanel } from '@/components/chat/RagDebugPanel'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { chatService } from '@/services/chatService'
import { documentService } from '@/services/documentService'
import { settingsService } from '@/services/settingsService'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Message, RetrievedChunk, Document } from '@/types'

interface PendingWebSearch {
  query: string
  conversationId: number | null
}

export function ChatPage() {
  const {
    conversations, activeConversationId, messages,
    streamingMessage, isStreaming, showDebugPanel,
    setConversations, setActiveConversation, setMessages,
    appendMessage, setStreamingMessage, appendStreamToken,
    setIsStreaming, setLastDebugInfo, toggleDebugPanel, addConversation,
    setActiveConversationId,
  } = useChatStore()

  const { user } = useAuthStore()
  const userId = user?.id

  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile')
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [pendingWebSearch, setPendingWebSearch] = useState<PendingWebSearch | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<number>>(new Set())
  const [sourceSelectorOpen, setSourceSelectorOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Queries are keyed by userId — cache can never bleed across accounts
  const { data: allDocs = [] } = useQuery<Document[]>({
    queryKey: ['documents', userId],
    queryFn: documentService.list,
    staleTime: 30_000,
    enabled: !!userId,
  })
  const indexedDocs = allDocs.filter((d) => d.status === 'indexed')

  useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      const convs = await chatService.getHistory()
      setConversations(convs)
      return convs
    },
    enabled: !!userId,
  })

  useQuery({
    queryKey: ['default-settings', userId],
    queryFn: async () => {
      const s = await settingsService.get()
      setSelectedModel(s.model_name)
      return s
    },
    enabled: !!userId,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  const loadConversation = async (id: number) => {
    setLoadingConversation(true)
    setActiveConversation(id)
    setPendingWebSearch(null)
    try {
      const detail = await chatService.getConversation(id)
      setMessages(detail.messages)
    } catch {
      toast({ title: 'Failed to load conversation', variant: 'destructive' })
    } finally {
      setLoadingConversation(false)
    }
  }

  const handleNewChat = () => {
    setActiveConversation(null)
    setMessages([])
    setStreamingMessage('')
    setPendingWebSearch(null)
  }

  const handleSend = async (message: string, allowWebSearch = false) => {
    setSourceSelectorOpen(false)
    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: message,
      prompt_tokens: 0,
      completion_tokens: 0,
      response_time_ms: 0,
      timestamp: new Date().toISOString(),
    }
    appendMessage(userMsg)
    setIsStreaming(true)
    setStreamingMessage('')
    setPendingWebSearch(null)

    try {
      const sourceIds = selectedSourceIds.size > 0 ? Array.from(selectedSourceIds) : undefined
      const response = await chatService.sendMessage(
        message,
        activeConversationId ?? undefined,
        selectedModel,
        allowWebSearch,
        undefined,
        undefined,
        sourceIds,
      )

      const assistantMsg: Message = {
        id: response.message_id,
        role: 'assistant',
        content: response.answer,
        prompt_tokens: response.prompt_tokens,
        completion_tokens: response.completion_tokens,
        response_time_ms: response.response_time_ms,
        from_web: response.from_web,
        timestamp: new Date().toISOString(),
      }
      appendMessage(assistantMsg)
      setStreamingMessage('')

      setLastDebugInfo({
        promptTokens: response.prompt_tokens,
        completionTokens: response.completion_tokens,
        responseTimeMs: response.response_time_ms,
        retrievalChunks: response.retrieved_chunks,
      })

      // Show web search permission prompt
      if (response.web_search_available) {
        setPendingWebSearch({
          query: message,
          conversationId: response.conversation_id,
        })
      }

      if (!activeConversationId) {
        const updatedConvs = await chatService.getHistory()
        setConversations(updatedConvs)
        // Use setActiveConversationId (NOT setActiveConversation) so messages are NOT cleared
        setActiveConversationId(response.conversation_id)
      }
    } catch (err: any) {
      toast({
        title: 'Failed to send message',
        description: err.response?.data?.detail ?? 'Network error',
        variant: 'destructive',
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleWebSearchApproved = async () => {
    if (!pendingWebSearch) return
    const { query, conversationId } = pendingWebSearch
    setPendingWebSearch(null)
    setIsStreaming(true)

    try {
      const sourceIds = selectedSourceIds.size > 0 ? Array.from(selectedSourceIds) : undefined
      const response = await chatService.sendMessage(
        query,
        conversationId ?? activeConversationId ?? undefined,
        selectedModel,
        true,   // allowWebSearch
        true,   // skipUserMessage — user msg already saved from the first request
        true,   // forceWebSearch — bypass RAG and go straight to web search
        sourceIds,
      )

      const assistantMsg: Message = {
        id: response.message_id,
        role: 'assistant',
        content: response.answer,
        prompt_tokens: response.prompt_tokens,
        completion_tokens: response.completion_tokens,
        response_time_ms: response.response_time_ms,
        from_web: response.from_web,
        timestamp: new Date().toISOString(),
      }
      appendMessage(assistantMsg)

      setLastDebugInfo({
        promptTokens: response.prompt_tokens,
        completionTokens: response.completion_tokens,
        responseTimeMs: response.response_time_ms,
        retrievalChunks: response.retrieved_chunks,
      })
    } catch (err: any) {
      toast({
        title: 'Web search failed',
        description: err.response?.data?.detail ?? 'Network error',
        variant: 'destructive',
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) handleSend(lastUser.content)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ChatSidebar
        onNewChat={handleNewChat}
        onSelectConversation={loadConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="md:hidden h-8 w-8">
              <Menu className="w-4 h-4" />
            </Button>
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDebugPanel}
              className={cn('gap-1', showDebugPanel ? 'text-primary font-semibold' : 'text-muted-foreground')}
            >
              <Bug className="w-4 h-4" />
              <span className="hidden sm:inline">Debug</span>
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 && !streamingMessage ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
              {/* UAE-styled hero icon */}
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl btn-uae flex items-center justify-center shadow-uae-lg animate-pulse-green">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gold border-2 border-background" />
              </div>

              <div className="text-center max-w-md">
                <h2 className="text-2xl font-black tracking-tight mb-1">How can I help you?</h2>
                {/* UAE gold divider */}
                <div className="mx-auto my-3 w-16 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Ask me anything about your uploaded documents. I answer only from your knowledge base.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg mt-2">
                {[
                  'Summarize the key points from my documents',
                  'What are the main topics covered?',
                  'Explain the important concepts',
                  'What questions can I answer about your docs?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="suggestion-card text-left p-3.5 rounded-xl bg-card text-sm text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full p-4 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <MessageBubble message={msg} />
                  {msg.from_web && (
                    <div className="flex items-center gap-1.5 mt-1 ml-11 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3 text-primary" />
                      <span className="text-primary">Answer based on external web sources</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Web search permission card */}
              {pendingWebSearch && !isStreaming && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm font-semibold mb-3">Search the internet for more information?</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      No relevant information was found in your documents. I can search external internet
                      sources, but results will be from outside your knowledge base.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleWebSearchApproved}
                        className="gap-1.5 btn-uae text-white border-0"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Yes, search the web
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingWebSearch(null)}
                        className="gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        No, thanks
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[80%]">
                    <div className="flex gap-1 items-center h-5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.length > 0 && !isStreaming && !pendingWebSearch && (
                <div className="flex justify-center pb-2">
                  <Button variant="ghost" size="sm" onClick={handleRegenerate} className="gap-2 text-muted-foreground">
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Source Selector */}
        {indexedDocs.length > 0 && (
          <div className="px-4 pb-1 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setSourceSelectorOpen((v) => !v)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>
                  {selectedSourceIds.size === 0
                    ? 'Sources: All documents'
                    : `Sources: ${selectedSourceIds.size} selected`}
                </span>
                {selectedSourceIds.size > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">{selectedSourceIds.size}</Badge>
                )}
                <ChevronDown className={cn('w-3 h-3 transition-transform', sourceSelectorOpen && 'rotate-180')} />
              </button>

              {sourceSelectorOpen && (
                <div className="absolute bottom-full mb-1 left-0 w-80 bg-popover border border-border rounded-xl shadow-lg z-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Select knowledge sources</p>
                    {selectedSourceIds.size > 0 && (
                      <button
                        onClick={() => setSelectedSourceIds(new Set())}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {indexedDocs.map((doc) => {
                      const checked = selectedSourceIds.has(doc.id)
                      return (
                        <label
                          key={doc.id}
                          className={cn(
                            'flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
                            checked ? 'bg-primary/10' : 'hover:bg-muted/50',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedSourceIds((prev) => {
                                const next = new Set(prev)
                                next.has(doc.id) ? next.delete(doc.id) : next.add(doc.id)
                                return next
                              })
                            }}
                            className="rounded"
                          />
                          {doc.source_type === 'url'
                            ? <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            : doc.source_type === 'text'
                            ? <Type className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                            : <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                          <span className="text-sm truncate">{doc.keyword ?? doc.original_filename}</span>
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    {selectedSourceIds.size === 0 ? 'All sources will be searched.' : 'Only selected sources will be searched.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <MessageInput onSend={handleSend} isStreaming={isStreaming} onFocus={() => setSourceSelectorOpen(false)} />
      </div>

      <RagDebugPanel />
    </div>
  )
}
