import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Trash2, RefreshCw, Search,
  CheckCircle, AlertCircle, Clock, Loader2, Database,
  HardDrive, Layers, Files, ShieldCheck, User, Globe, Type, Link, Plus, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { documentService } from '@/services/documentService'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { cn, formatBytes, formatDate } from '@/lib/utils'
import type { Document, DocumentStatus } from '@/types'

const statusConfig: Record<DocumentStatus, { label: string; icon: React.ElementType; variant: string }> = {
  pending:    { label: 'Pending',    icon: Clock,         variant: 'warning'     },
  processing: { label: 'Processing', icon: Loader2,       variant: 'info'        },
  indexed:    { label: 'Indexed',    icon: CheckCircle,   variant: 'success'     },
  failed:     { label: 'Failed',     icon: AlertCircle,   variant: 'destructive' },
}

function TipCell({ text, className }: { text: string; className?: string }) {
  return (
    <div className="relative group/tip min-w-0">
      <p className={cn('truncate', className)}>{text}</p>
      <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 z-50
                      hidden group-hover/tip:block">
        <div className="bg-popover border border-border text-popover-foreground
                        text-xs px-2.5 py-1.5 rounded-lg shadow-uae-lg
                        max-w-xs break-all whitespace-normal leading-relaxed">
          {text}
        </div>
        {/* arrow */}
        <div className="ml-3 w-2 h-2 rotate-45 bg-popover border-r border-b border-border -mt-1" />
      </div>
    </div>
  )
}

type IngestTab = 'file' | 'url' | 'text'

export function DocumentsPage() {
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')
  const [selected, setSelected]         = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab]       = useState<IngestTab>('file')
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const { toast }       = useToast()
  const queryClient     = useQueryClient()
  const { user }        = useAuthStore()
  const isAdmin         = user?.role === 'admin'
  const userId          = user?.id

  // URL ingestion state
  const [urlValue, setUrlValue]     = useState('')
  const [urlKeyword, setUrlKeyword] = useState('')
  const [urlError, setUrlError]     = useState('')
  // Text ingestion state
  const [textKeyword, setTextKeyword] = useState('')
  const [textContent, setTextContent] = useState('')

  const TEXT_MAX    = 500_000
  const KEYWORD_MAX = 255

  const validateUrl = (v: string) => {
    if (!v) return ''
    try {
      const u = new URL(v)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'URL must start with http:// or https://'
      return ''
    } catch {
      return 'Enter a valid URL (e.g. https://example.com)'
    }
  }

  const handleUrlChange = (v: string) => { setUrlValue(v); setUrlError(validateUrl(v)) }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents', userId] })
    queryClient.invalidateQueries({ queryKey: ['document-stats', userId] })
    setShowAddPanel(false)   // auto-close Add Content panel on mobile after ingestion
  }

  const urlMutation = useMutation({
    mutationFn: () => {
      const err = validateUrl(urlValue.trim())
      if (err) { setUrlError(err); return Promise.reject(new Error(err)) }
      return documentService.ingestUrl(urlValue.trim(), urlKeyword.trim())
    },
    onSuccess: () => {
      toast({ title: 'Website queued for crawling', description: 'Indexing runs in the background.' })
      setUrlValue(''); setUrlKeyword(''); setUrlError('')
      invalidate()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail ?? err.message ?? 'Error'
      if (!err.response) return
      toast({ title: 'URL ingestion failed', description: msg, variant: 'destructive' })
    },
  })

  const textMutation = useMutation({
    mutationFn: () => documentService.ingestText(textKeyword.trim(), textContent.trim()),
    onSuccess: () => {
      toast({ title: 'Text queued for indexing', description: 'Indexing runs in the background.' })
      setTextKeyword(''); setTextContent('')
      invalidate()
    },
    onError: (err: any) => toast({ title: 'Text ingestion failed', description: err.response?.data?.detail ?? 'Error', variant: 'destructive' }),
  })

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', userId],
    queryFn: documentService.list,
    enabled: !!userId,
    refetchInterval: (query) => {
      const data = query.state.data as Document[] | undefined
      return data?.some((d) => d.status === 'processing' || d.status === 'pending') ? 3000 : false
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['document-stats', userId],
    queryFn: documentService.getStats,
    enabled: !!userId,
    refetchInterval: 10000,
  })

  const filtered = documents.filter((d) => {
    const matchesSearch  = d.original_filename.toLowerCase().includes(search.toLowerCase())
    const matchesStatus  = statusFilter === 'all' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await documentService.delete(deleteTarget.id)
      queryClient.invalidateQueries({ queryKey: ['documents', userId] })
      queryClient.invalidateQueries({ queryKey: ['document-stats', userId] })
      toast({ title: 'Document deleted' })
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleReindex = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    try {
      await documentService.reindex(ids)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['documents', userId] })
      toast({ title: `Reindexing ${ids.length} document(s)` })
    } catch { toast({ title: 'Reindex failed', variant: 'destructive' }) }
  }

  const handleRetry = async (id: number) => {
    try {
      await documentService.reindex([id])
      queryClient.invalidateQueries({ queryKey: ['documents', userId] })
      toast({ title: 'Document queued for reprocessing' })
    } catch { toast({ title: 'Retry failed', variant: 'destructive' }) }
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const statCards = [
    { label: 'Total Documents', value: stats?.total_documents ?? 0,              icon: Files,    color: 'text-primary'    },
    { label: 'Total Chunks',    value: stats?.total_chunks ?? 0,                 icon: Layers,   color: 'text-accent'     },
    { label: 'Vectors',         value: stats?.vector_count ?? 0,                 icon: Database, color: 'text-green-500'  },
    { label: 'Storage',         value: formatBytes(stats?.storage_used_bytes ?? 0), icon: HardDrive, color: 'text-orange-500' },
  ]

  const tabs: { id: IngestTab; label: string; icon: React.ElementType }[] = [
    { id: 'file', label: 'Upload File', icon: FileText },
    { id: 'url',  label: 'Website URL', icon: Globe    },
    { id: 'text', label: 'Paste Text',  icon: Type     },
  ]

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-bold text-lg whitespace-nowrap">Knowledge Base</h1>
          {isAdmin && (
            <Badge variant="secondary" className="gap-1 text-xs hidden sm:flex">
              <ShieldCheck className="w-3 h-3" />
              Admin View
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Inline stat chips — desktop only */}
          <div className="hidden lg:flex items-center gap-3">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1">
                <Icon className={cn('w-3.5 h-3.5', color)} />
                <span className="text-xs text-muted-foreground">{label}:</span>
                <span className="text-xs font-bold">{value}</span>
              </div>
            ))}
          </div>
          {/* Mobile: toggle Add Content panel */}
          <button
            onClick={() => setShowAddPanel((v) => !v)}
            className={cn(
              'md:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium',
              showAddPanel
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-foreground border-border hover:bg-muted',
            )}
          >
            {showAddPanel ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddPanel ? 'Close' : 'Add Content'}
          </button>
        </div>
      </div>

      {/* ── Body: left panel + right panel ────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* ── Left: Add Content panel ── */}
        {/* Mobile: full-width collapsible at top | Desktop: fixed-width sidebar */}
        <div className={cn(
          'border-border bg-card/50 flex-col overflow-hidden flex-shrink-0',
          'md:flex md:w-72 md:border-r',
          showAddPanel ? 'flex w-full border-b md:border-b-0' : 'hidden md:flex',
        )}>
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Add Content</p>
            {/* Tabs */}
            <div className="flex gap-0.5 bg-muted/60 p-0.5 rounded-xl">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                    activeTab === id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="leading-none text-[10px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">

            {/* File Upload tab */}
            {activeTab === 'file' && (
              <DocumentUpload onUploadComplete={invalidate} />
            )}

            {/* URL tab */}
            {activeTab === 'url' && (
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium">Display Name</label>
                    <span className={cn('text-xs', urlKeyword.length > KEYWORD_MAX ? 'text-destructive' : 'text-muted-foreground')}>
                      {urlKeyword.length}/{KEYWORD_MAX}
                    </span>
                  </div>
                  <Input
                    placeholder="e.g. Company Website"
                    value={urlKeyword}
                    onChange={(e) => setUrlKeyword(e.target.value.slice(0, KEYWORD_MAX))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Website URL</label>
                  <Input
                    placeholder="https://example.com"
                    value={urlValue}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className={cn('h-8 text-sm', urlError ? 'border-destructive focus-visible:ring-destructive' : '')}
                  />
                  {urlError && <p className="text-xs text-destructive mt-1">{urlError}</p>}
                </div>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  disabled={!urlValue.trim() || !urlKeyword.trim() || !!urlError || urlMutation.isPending}
                  onClick={() => urlMutation.mutate()}
                >
                  {urlMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                  {urlMutation.isPending ? 'Crawling…' : 'Crawl & Index'}
                </Button>
              </div>
            )}

            {/* Text tab */}
            {activeTab === 'text' && (
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium">Display Name</label>
                    <span className={cn('text-xs', textKeyword.length > KEYWORD_MAX ? 'text-destructive' : 'text-muted-foreground')}>
                      {textKeyword.length}/{KEYWORD_MAX}
                    </span>
                  </div>
                  <Input
                    placeholder="e.g. Course Syllabus"
                    value={textKeyword}
                    onChange={(e) => setTextKeyword(e.target.value.slice(0, KEYWORD_MAX))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Text Content</label>
                  <Textarea
                    placeholder="Paste your text here…"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value.slice(0, TEXT_MAX))}
                    className={cn('text-sm resize-none', textContent.length > 0 && textContent.trim().length < 10 ? 'border-destructive' : '')}
                    rows={7}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-destructive">
                      {textContent.length > 0 && textContent.trim().length < 10 ? 'Min. 10 characters' : ''}
                    </span>
                    <span className={cn('text-xs', textContent.length > TEXT_MAX * 0.95 ? 'text-destructive' : 'text-muted-foreground')}>
                      {textContent.length.toLocaleString()} / {TEXT_MAX.toLocaleString()}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-2"
                  disabled={!textContent.trim() || textContent.trim().length < 10 || !textKeyword.trim() || textContent.length > TEXT_MAX || textMutation.isPending}
                  onClick={() => textMutation.mutate()}
                >
                  {textMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Type className="w-3.5 h-3.5" />}
                  {textMutation.isPending ? 'Indexing…' : 'Index Text'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Document list (fills remaining space, scrolls internally) ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Document list toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-border bg-card/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Documents</span>
              <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
              {selected.size > 0 && (
                <Button size="sm" variant="outline" onClick={handleReindex} className="gap-1.5 h-7 text-xs">
                  <RefreshCw className="w-3 h-3" /> Reindex ({selected.size})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm w-32 sm:w-44"
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

          {/* Table — scrolls independently */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm text-center px-4">No documents yet — tap <strong>Add Content</strong> above to get started</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/60 backdrop-blur-sm">
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((d) => d.id)) : new Set())}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-[40%]">Name</th>
                    {isAdmin && (
                      <th className="hidden sm:table-cell text-left p-3 text-xs font-semibold text-muted-foreground w-[18%]">Owner</th>
                    )}
                    <th className="hidden sm:table-cell text-left p-3 text-xs font-semibold text-muted-foreground">Type</th>
                    <th className="hidden md:table-cell text-left p-3 text-xs font-semibold text-muted-foreground">Chunks</th>
                    <th className="hidden md:table-cell text-left p-3 text-xs font-semibold text-muted-foreground">Size</th>
                    <th className="hidden lg:table-cell text-left p-3 text-xs font-semibold text-muted-foreground">Uploaded</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Actions</th>
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
                        <td className="p-3 max-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {doc.source_type === 'url'
                              ? <Globe    className="w-4 h-4 text-primary flex-shrink-0" />
                              : doc.source_type === 'text'
                              ? <Type     className="w-4 h-4 text-accent flex-shrink-0" />
                              : <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <TipCell text={doc.keyword ?? doc.original_filename} className="text-sm font-medium" />
                              {doc.source_url && (
                                <TipCell text={doc.source_url} className="text-xs text-muted-foreground mt-0.5" />
                              )}
                            </div>
                          </div>
                          {doc.error_message && (
                            <TipCell text={doc.error_message} className="text-xs text-destructive mt-0.5" />
                          )}
                        </td>
                        {isAdmin && (
                          <td className="hidden sm:table-cell p-3 max-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <TipCell text={doc.owner_email ?? '—'} className="text-xs text-muted-foreground" />
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
                            <StatusIcon className={cn(
                              'w-3.5 h-3.5',
                              doc.status === 'processing' && 'animate-spin text-primary',
                              doc.status === 'indexed'    && 'text-green-500',
                              doc.status === 'failed'     && 'text-destructive',
                              doc.status === 'pending'    && 'text-yellow-500',
                            )} />
                            <Badge variant={status.variant as any} className="text-xs">{status.label}</Badge>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {doc.status !== 'indexed' && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Retry" onClick={() => handleRetry(doc.id)}>
                                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setDeleteTarget({ id: doc.id, name: doc.original_filename })}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={!!deleteTarget}
      title="Delete Document"
      description={`"${deleteTarget?.name ?? ''}" and all its indexed chunks will be permanently deleted. This cannot be undone.`}
      confirmLabel="Delete Document"
      loading={deleting}
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  )
}
