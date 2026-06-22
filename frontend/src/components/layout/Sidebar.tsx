import { NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, FileText, Settings, Search, LogOut, Bot, Moon, Sun } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useChatStore } from '@/store/chatStore'

const navItems = [
  { to: '/chat',      icon: MessageSquare, label: 'Chat' },
  { to: '/documents', icon: FileText,      label: 'Knowledge Base' },
  { to: '/search',    icon: Search,        label: 'Search' },
  { to: '/settings',  icon: Settings,      label: 'Settings' },
]

export function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { resetChatStore } = useChatStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = () => {
    clearAuth()
    resetChatStore()
    queryClient.clear()
    navigate('/login')
  }

  const initials = user?.name?.[0]?.toUpperCase() ?? 'U'

  return (
    <aside className="flex flex-col w-16 lg:w-64 h-full border-r border-border bg-card">
      {/* ── UAE Brand Header ─────────────────────── */}
      <div className="sidebar-brand flex items-center gap-3 px-4 h-16 flex-shrink-0">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="hidden lg:block">
          <p className="font-black text-base tracking-tight text-white leading-tight">RINZ Chatbot</p>
          <p className="text-[10px] text-white/60 tracking-widest uppercase leading-none mt-0.5">AI Assistant</p>
        </div>
      </div>

      {/* UAE Gold bar separator */}
      <div className="uae-gold-bar flex-shrink-0" />

      {/* ── Navigation ──────────────────────────── */}
      <nav className="flex-1 p-2 space-y-0.5 mt-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'nav-active'
                  : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground'
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom Controls ──────────────────────── */}
      <div className="p-2 border-t border-border space-y-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="w-full lg:w-auto lg:px-3 justify-center lg:justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="hidden lg:block text-sm">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </Button>

        {/* User avatar + info */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0 shadow-uae">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        {/* Mobile avatar */}
        <div className="flex lg:hidden justify-center py-1">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-uae">
            {initials}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="w-full lg:w-auto lg:px-3 justify-center lg:justify-start gap-3 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden lg:block text-sm">Logout</span>
        </Button>
      </div>
    </aside>
  )
}
