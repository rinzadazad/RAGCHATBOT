import { useState } from 'react'
import { Plus, Search, Trash2, Edit2, MessageSquare, Check, X, Eraser, AlertTriangle } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatStore } from '@/store/chatStore'
import { chatService } from '@/services/chatService'
import { useToast } from '@/hooks/use-toast'
import type { Conversation } from '@/types'

interface Props {
  onNewChat: () => void
  onSelectConversation: (id: number) => void
  isOpen?: boolean
  onClose?: () => void
}

export function ChatSidebar({ onNewChat, onSelectConversation, isOpen, onClose }: Props) {
  const { conversations, activeConversationId, removeConversation, updateConversationTitle, clearConversations } = useChatStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const { toast } = useToast()

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    try {
      await chatService.deleteConversation(id)
      removeConversation(id)
      toast({ title: 'Conversation deleted', variant: 'default' })
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
  }

  const handleClearAll = async () => {
    if (!clearConfirm) {
      setClearConfirm(true)
      // auto-cancel after 4 s if user doesn't confirm
      setTimeout(() => setClearConfirm(false), 4000)
      return
    }
    setClearing(true)
    try {
      await chatService.deleteAllConversations()
      clearConversations()
      toast({ title: 'All chats cleared' })
    } catch {
      toast({ title: 'Failed to clear chats', variant: 'destructive' })
    } finally {
      setClearing(false)
      setClearConfirm(false)
    }
  }

  const handleRenameStart = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation()
    setRenamingId(conv.id)
    setRenameValue(conv.title)
  }

  const handleRenameConfirm = async (id: number) => {
    if (!renameValue.trim()) return
    try {
      await chatService.renameConversation(id, renameValue.trim())
      updateConversationTitle(id, renameValue.trim())
      setRenamingId(null)
    } catch {
      toast({ title: 'Failed to rename', variant: 'destructive' })
    }
  }

  const handleSelect = (id: number) => {
    onSelectConversation(id)
    onClose?.()
  }

  const handleNewChat = () => {
    onNewChat()
    onClose?.()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'flex flex-col h-full border-r border-border',
          isOpen
            ? 'fixed inset-y-0 left-16 w-72 z-50 shadow-2xl bg-card'
            : 'hidden md:flex w-64 bg-card/50'
        )}
      >
        {/* Header */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <Button onClick={handleNewChat} className="flex-1 gap-2" size="sm">
              <Plus className="w-4 h-4" /> New Chat
            </Button>
            {isOpen && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Clear All row — always visible in header */}
          {conversations.length > 0 && (
            clearConfirm ? (
              <div className="flex items-center gap-2 animate-fade-in bg-destructive/8 border border-destructive/20 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                <p className="flex-1 text-xs text-destructive font-medium">Delete all {conversations.length} chats?</p>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="text-xs font-bold text-destructive hover:text-destructive/80 px-2 py-0.5 rounded border border-destructive/40 hover:bg-destructive/15 transition-colors disabled:opacity-50"
                >
                  {clearing ? '…' : 'Yes'}
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border hover:bg-accent transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1.5 rounded-lg border border-border hover:border-destructive/30 hover:bg-destructive/8 group"
              >
                <Eraser className="w-3.5 h-3.5 group-hover:text-destructive" />
                Clear all chats
              </button>
            )
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </p>
          )}
          {filtered.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={cn(
                'group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm',
                activeConversationId === conv.id
                  ? 'bg-primary/10 text-foreground'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              {renamingId === conv.id ? (
                <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameConfirm(conv.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="h-6 text-xs px-1"
                    autoFocus
                  />
                  <button onClick={() => handleRenameConfirm(conv.id)} className="text-green-500 hover:text-green-400">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => setRenamingId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(conv.updated_at)}</p>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button onClick={(e) => handleRenameStart(e, conv)} className="p-0.5 hover:text-foreground">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => handleDelete(e, conv.id)} className="p-0.5 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
