import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessageSquare, User, Bot, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { searchService } from '@/services/searchService'
import { useChatStore } from '@/store/chatStore'
import { formatRelativeTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { SearchResult } from '@/types'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { setActiveConversation } = useChatStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await searchService.searchChats(query)
      setResults(data.results)
      setTotal(data.total)
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = (conversationId: number) => {
    setActiveConversation(conversationId)
    navigate('/chat')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center px-6 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
        <h1 className="font-semibold text-lg">Search</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search across all your conversations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 h-12 text-base rounded-xl border-border/60 focus-visible:ring-primary/30"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && searched && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {total === 0 ? 'No results found' : `Found ${total} result${total !== 1 ? 's' : ''}`}
              </p>

              {results.map((result) => (
                <Card
                  key={result.message_id}
                  className="border-border/50 hover:border-primary/30 cursor-pointer transition-all"
                  onClick={() => handleOpen(result.conversation_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${result.role === 'user' ? 'bg-primary/10' : 'bg-secondary'}`}>
                          {result.role === 'user' ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-primary">{result.conversation_title}</span>
                            <Badge variant="outline" className="text-xs">{result.role}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {result.content_snippet}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        <span>{formatRelativeTime(result.timestamp)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!searched && (
            <div className="text-center py-16">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">Search your conversations, questions and answers</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
