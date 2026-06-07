import { useState } from 'react'
import { Plus, Search, Trash2, Edit2, MessageSquare, Check, X } from 'lucide-react'
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
}

export function ChatSidebar({ onNewChat, onSelectConversation }: Props) {
  const { conversations, activeConversationId, removeConversation, updateConversationTitle } = useChatStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
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

  return (
    <div className="flex flex-col w-64 h-full border-r border-border bg-card/50">
      <div className="p-3 border-b border-border">
        <Button onClick={onNewChat} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" /> New Chat
        </Button>
      </div>

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

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </p>
        )}
        {filtered.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
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
  )
}
