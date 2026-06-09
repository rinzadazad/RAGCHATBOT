import { NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, FileText, Settings, Search, LogOut, Bot, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useChatStore } from '@/store/chatStore'

const navItems = [
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/documents', icon: FileText, label: 'Knowledge Base' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { resetChatStore } = useChatStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    resetChatStore()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col w-16 lg:w-64 h-full border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16 border-b border-border">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="hidden lg:block font-bold text-lg tracking-tight">RINZ Chatbot</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="p-2 border-t border-border space-y-1">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-full lg:w-auto lg:px-3 justify-center lg:justify-start gap-3">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="hidden lg:block text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </Button>

        <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="w-full lg:w-auto lg:px-3 justify-center lg:justify-start gap-3 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden lg:block text-sm">Logout</span>
        </Button>
      </div>
    </aside>
  )
}
