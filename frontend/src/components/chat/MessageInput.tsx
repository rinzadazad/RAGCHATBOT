import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  onSend: (message: string) => void
  isStreaming: boolean
  onStop?: () => void
  disabled?: boolean
}

export function MessageInput({ onSend, isStreaming, onStop, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const msg = value.trim()
    if (!msg || isStreaming || disabled) return
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onSend(msg)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  return (
    <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        <div className={cn(
          'flex items-end gap-2 rounded-xl border border-border bg-card shadow-sm transition-all',
          'focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20'
        )}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents..."
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-[200px]"
          />
          <div className="p-2">
            {isStreaming ? (
              <Button size="icon" variant="ghost" onClick={onStop} className="h-8 w-8 text-destructive hover:text-destructive">
                <Square className="w-4 h-4 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!value.trim() || disabled}
                className="h-8 w-8"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
