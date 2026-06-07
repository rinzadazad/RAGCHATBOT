export interface User {
  id: number
  name: string
  email: string
  role?: string
  created_at: string
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}

export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed'

export interface Document {
  id: number
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  chunk_count: number
  status: DocumentStatus
  error_message?: string
  upload_date: string
  updated_at?: string
  owner_email?: string
  source_type: 'file' | 'url' | 'text'
  keyword?: string
  source_url?: string
}

export interface DocumentStats {
  total_documents: number
  total_chunks: number
  indexed_documents: number
  failed_documents: number
  storage_used_bytes: number
  vector_count?: number
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: number
  role: MessageRole
  content: string
  rag_context?: string
  retrieved_chunks?: string
  prompt_tokens: number
  completion_tokens: number
  response_time_ms: number
  from_web?: boolean
  timestamp: string
}

export interface Conversation {
  id: number
  title: string
  created_at: string
  updated_at: string
  message_count?: number
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface ChatResponse {
  conversation_id: number
  message_id: number
  answer: string
  retrieved_chunks: RetrievedChunk[]
  prompt_tokens: number
  completion_tokens: number
  response_time_ms: number
  web_search_available?: boolean
  from_web?: boolean
}

export interface RetrievedChunk {
  chunk_id: string
  text: string
  similarity_score: number
  document_name: string
  document_id?: string
}

export interface SearchResult {
  conversation_id: number
  conversation_title: string
  message_id: number
  role: string
  content_snippet: string
  timestamp: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  page: number
  page_size: number
}

export interface Settings {
  id: number
  model_name: string
  temperature: number
  max_tokens: number
  top_p: number
  chunk_size: number
  chunk_overlap: number
  top_k: number
  similarity_threshold: number
  updated_at?: string
}

export interface ModelInfo {
  id: string
  description: string
  context_window: number
}
