import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Trash2, RefreshCw, Search,
  CheckCircle, AlertCircle, Clock, Loader2, Database,
  HardDrive, Layers, Files, ShieldCheck, User, Globe, Type, Link,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { documentService } from '@/services/documentService'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { cn, formatBytes, formatDate } from '@/lib/utils'
import type { Document, DocumentStatus } from '@/types'

const statusConfig: Record<DocumentStatus, { label: string; icon: React.ElementType; variant: string }> = {
  pending: { label: 'Pending', icon: Clock, variant: 'warning' },
  processing: { label: 'Processing', icon: Loader2, variant: 'info' },
  indexed: { label: 'Indexed', icon: CheckCircle, variant: 'success' },
  failed: { label: 'Failed', icon: AlertCircle, variant: 'destructive' },
}

export function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  // URL ingestion state
  const [urlValue, setUrlValue] = useState('')
  const [urlKeyword, setUrlKeyword] = useState('')
  // Text ingestion state
  const [textKeyword, setTextKeyword] = useState('')
  const [textContent, setTextContent] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['document-stats'] })
  }

  const urlMutation = useMutation({
    mutationFn: () => documentService.ingestUrl(urlValue.trim(), urlKeyword.trim()),
    onSuccess: () => {
      toast({ title: 'Website queued for crawling', description: 'Indexing runs in the background.' })
      setUrlValue('')
      setUrlKeyword('')
      invalidate()
    },
    onError: (err: any) => toast({ title: 'URL ingestion failed', description: err.response?.data?.detail ?? 'Error', variant: 'destructive' }),
  })

  const textMutation = useMutation({
    mutationFn: () => documentService.ingestText(textKeyword.trim(), textContent.trim()),
    onSuccess: () => {
      toast({ title: 'Text queued for indexing', description: 'Indexing runs in the background.' })
      setTextKeyword('')
      setTextContent('')
      invalidate()
    },
    onError: (err: any) => toast({ title: 'Text ingestion failed', description: err.response?.data?.detail ?? 'Error', variant: 'destructive' }),
  })

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: documentService.list,
    refetchInterval: (query) => {
      const data = query.state.data as Document[] | undefined
      return data?.some((d) => d.status === 'processing' || d.status === 'pending') ? 3000 : false
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['document-stats'],
    queryFn: documentService.getStats,
    refetchInterval: 10000,
  })

  const filtered = documents.filter((d) => {
    const matchesSearch = d.original_filename.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = async (id: number) => {
    try {
      await documentService.delete(id)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      toast({ title: 'Document deleted' })
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  const handleReindex = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    try {
      await documentService.reindex(ids)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast({ title: `Reindexing ${ids.length} document(s)` })
    } catch {
      toast({ title: 'Reindex failed', variant: 'destructive' })
    }
  }

  const handleRetry = async (id: number) => {
    try {
      await documentService.reindex([id])
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast({ title: 'Document queued for reprocessing' })
    } catch {
      toast({ title: 'Retry failed', variant: 'destructive' })
    }
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const statCards = [
    { label: 'Total Documents', value: stats?.total_documents ?? 0, icon: Files, color: 'text-blue-500' },
    { label: 'Total Chunks', value: stats?.total_chunks ?? 0, icon: Layers, color: 'text-purple-500' },
    { label: 'Vector Count', value: stats?.vector_count ?? 0, icon: Database, color: 'text-green-500' },
    { label: 'Storage Used', value: formatBytes(stats?.storage_used_bytes ?? 0), icon: HardDrive, color: 'text-orange-500' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg">Knowledge Base</h1>
          {isAdmin && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <ShieldCheck className="w-3 h-3" />
              Admin View — All Users
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                  </div>
                  <div className={cn('p-2 rounded-lg bg-muted/50', color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ingestion row: file upload + URL + text side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* File Upload */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Upload Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload onUploadComplete={invalidate} />
            </CardContent>
          </Card>

          {/* URL Ingestion */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" /> Add Website URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Display Name (keyword)</label>
                <Input
                  placeholder="e.g. Company Website"
                  value={urlKeyword}
                  onChange={(e) => setUrlKeyword(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Website URL</label>
                <Input
                  placeholder="https://example.com"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  className="h-8 text-sm"
                  type="url"
                />
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                disabled={!urlValue.trim() || !urlKeyword.trim() || urlMutation.isPending}
                onClick={() => urlMutation.mutate()}
              >
                {urlMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                {urlMutation.isPending ? 'Crawling…' : 'Crawl & Index'}
              </Button>
            </CardContent>
          </Card>

          {/* Text Ingestion */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Type className="w-4 h-4 text-purple-500" /> Add Text Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Display Name (keyword)</label>
                <Input
                  placeholder="e.g. Course Syllabus"
                  value={textKeyword}
                  onChange={(e) => setTextKeyword(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Text Content</label>
                <Textarea
                  placeholder="Paste your text here…"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="text-sm resize-none h-[68px]"
                />
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                disabled={!textContent.trim() || !textKeyword.trim() || textMutation.isPending}
                onClick={() => textMutation.mutate()}
              >
                {textMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Type className="w-3.5 h-3.5" />}
                {textMutation.isPending ? 'Indexing…' : 'Index Text'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">Documents</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {selected.size > 0 && (
                  <Button size="sm" variant="outline" onClick={handleReindex} className="gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Reindex ({selected.size})
                  </Button>
                )}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm w-48"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="all">All Status</option>
                  <option value="indexed">Indexed</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No documents found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === filtered.length && filtered.length > 0}
                          onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((d) => d.id)) : new Set())}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                      {isAdmin && (
                        <th className="hidden sm:table-cell text-left p-3 text-xs font-medium text-muted-foreground">Owner</th>
                      )}
                      <th className="hidden sm:table-cell text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="hidden md:table-cell text-left p-3 text-xs font-medium text-muted-foreground">Chunks</th>
                      <th className="hidden md:table-cell text-left p-3 text-xs font-medium text-muted-foreground">Size</th>
                      <th className="hidden lg:table-cell text-left p-3 text-xs font-medium text-muted-foreground">Uploaded</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((doc) => {
                      const status = statusConfig[doc.status]
                      const StatusIcon = status.icon
                      return (
                        <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selected.has(doc.id)}
                              onChange={() => toggleSelect(doc.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {doc.source_type === 'url'
                                ? <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                : doc.source_type === 'text'
                                ? <Type className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                : <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate max-w-[200px]">
                                  {doc.keyword ?? doc.original_filename}
                                </p>
                                {doc.source_url && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.source_url}</p>
                                )}
                              </div>
                            </div>
                            {doc.error_message && (
                              <p className="text-xs text-destructive mt-0.5 truncate max-w-[200px]">{doc.error_message}</p>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="hidden sm:table-cell p-3">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate max-w-[160px]">{doc.owner_email ?? '—'}</span>
                              </div>
                            </td>
                          )}
                          <td className="hidden sm:table-cell p-3">
                            <Badge variant="secondary" className="uppercase text-xs">{doc.file_type}</Badge>
                          </td>
                          <td className="hidden md:table-cell p-3 text-sm text-muted-foreground">{doc.chunk_count}</td>
                          <td className="hidden md:table-cell p-3 text-sm text-muted-foreground">{formatBytes(doc.file_size)}</td>
                          <td className="hidden lg:table-cell p-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(doc.upload_date)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <StatusIcon className={cn('w-3.5 h-3.5', doc.status === 'processing' && 'animate-spin', doc.status === 'indexed' && 'text-green-500', doc.status === 'failed' && 'text-destructive', doc.status === 'pending' && 'text-yellow-500', doc.status === 'processing' && 'text-blue-500')} />
                              <Badge variant={status.variant as any} className="text-xs">{status.label}</Badge>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {doc.status !== 'indexed' && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Retry processing" onClick={() => handleRetry(doc.id)}>
                                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(doc.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
