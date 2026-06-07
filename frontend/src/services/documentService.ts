import api from './api'
import type { Document, DocumentStats } from '@/types'

export const documentService = {
  async upload(files: File[], onProgress?: (pct: number) => void): Promise<Document[]> {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    const { data } = await api.post<Document[]>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
    return data
  },

  async ingestUrl(url: string, keyword: string, maxPages = 50): Promise<Document> {
    const { data } = await api.post<Document>('/documents/ingest/url', { url, keyword, max_pages: maxPages })
    return data
  },

  async ingestText(keyword: string, content: string): Promise<Document> {
    const { data } = await api.post<Document>('/documents/ingest/text', { keyword, content })
    return data
  },

  async list(): Promise<Document[]> {
    const { data } = await api.get<Document[]>('/documents')
    return data
  },

  async getById(id: number): Promise<Document> {
    const { data } = await api.get<Document>(`/documents/${id}`)
    return data
  },

  async getStats(): Promise<DocumentStats> {
    const { data } = await api.get<DocumentStats>('/documents/stats')
    return data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/documents/${id}`)
  },

  async reindex(ids: number[]): Promise<Document[]> {
    const { data } = await api.post<Document[]>('/documents/reindex', { document_ids: ids })
    return data
  },
}
