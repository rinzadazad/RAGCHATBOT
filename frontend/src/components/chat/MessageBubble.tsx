import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Bot, User } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Message } from '@/types'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex gap-3 animate-fade-in', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
        isUser
          ? 'bubble-user'
          : 'bg-secondary text-secondary-foreground border border-border'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('group relative max-w-[80%] flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bubble-user rounded-tr-sm'
            : 'bg-card border border-border rounded-tl-sm'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a({ href, children, ...props }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:opacity-80"
                        {...props}
                      >
                        {children}
                      </a>
                    )
                  },
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match
                    return isInline ? (
                      <code
                        className={cn('bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary', className)}
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <div className="relative my-2">
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: '0.625rem', fontSize: '0.8rem' }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                        <CopyCodeButton code={String(children)} />
                      </div>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className={cn(
          'flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(message.timestamp)}</span>
          {!isUser && (
            <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
          {!isUser && message.completion_tokens > 0 && (
            <span className="badge-gold rounded-full px-1.5 py-0.5 text-[10px]">
              {message.completion_tokens} tokens
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className="absolute top-2 right-2 p-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}
