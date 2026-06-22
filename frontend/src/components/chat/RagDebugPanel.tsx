import { X, FileText, Clock, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useChatStore } from '@/store/chatStore'
import { cn } from '@/lib/utils'

export function RagDebugPanel() {
  const { lastDebugInfo, showDebugPanel, toggleDebugPanel } = useChatStore()

  if (!showDebugPanel) return null

  return (
    <div className="fixed inset-0 z-50 md:static md:inset-auto md:w-80 md:h-full border-l border-border bg-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">RAG Debug Panel</h3>
        <button onClick={toggleDebugPanel} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!lastDebugInfo ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center">
            Send a message to see RAG debug information
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Token Usage */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Token Usage</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Prompt', value: lastDebugInfo.promptTokens },
                { label: 'Completion', value: lastDebugInfo.completionTokens },
                { label: 'Total', value: lastDebugInfo.promptTokens + lastDebugInfo.completionTokens },
                { label: 'Response', value: `${Math.round(lastDebugInfo.responseTimeMs)}ms` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Retrieved Chunks */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Retrieved Chunks
              </h4>
              <Badge variant="secondary" className="text-xs">{lastDebugInfo.retrievalChunks.length}</Badge>
            </div>
            <div className="space-y-2">
              {lastDebugInfo.retrievalChunks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No chunks retrieved</p>
              ) : (
                lastDebugInfo.retrievalChunks.map((chunk, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-medium truncate">{chunk.document_name}</span>
                      </div>
                      <Badge
                        variant={chunk.similarity_score > 0.7 ? 'success' : chunk.similarity_score > 0.5 ? 'info' : 'warning'}
                        className="text-xs flex-shrink-0"
                      >
                        {(chunk.similarity_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{chunk.text}</p>
                    <p className="text-xs text-muted-foreground/60">ID: {chunk.chunk_id}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
