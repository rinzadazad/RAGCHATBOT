import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'

export function TopBar() {
  const { user, clearAuth } = useAuthStore()
  const { resetChatStore }  = useChatStore()
  const navigate            = useNavigate()
  const queryClient         = useQueryClient()

  const initials = user?.name?.[0]?.toUpperCase() ?? 'U'

  const handleLogout = () => {
    clearAuth()
    resetChatStore()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <header className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm z-30">
      {/* Brand — visible only on mobile (desktop has sidebar) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 rounded-lg btn-uae flex items-center justify-center shadow-uae">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-black text-sm tracking-tight">SafeChat AI</span>
      </div>

      {/* Spacer on desktop so user chip stays right-aligned */}
      <div className="hidden md:block" />

      {/* User chip + logout — always visible */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground shadow-uae flex-shrink-0">
            {initials}
          </div>
          <span className="text-xs font-medium text-foreground hidden sm:block max-w-[120px] truncate">
            {user?.name}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">Sign Out</span>
        </Button>
      </div>
    </header>
  )
}
