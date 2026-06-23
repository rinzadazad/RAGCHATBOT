import { NavLink } from 'react-router-dom'
import { House, MessageCircle, FileText, Search, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/home',      icon: House,          label: 'Home'     },
  { to: '/documents', icon: FileText,       label: 'Docs'     },
  { to: '/chat',      icon: MessageCircle,  label: 'Chat',  isChat: true },
  { to: '/search',    icon: Search,         label: 'Search'   },
  { to: '/settings',  icon: Settings,       label: 'Settings' },
]

export function MobileBottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-end justify-around h-16 px-1">
        {navItems.map(({ to, icon: Icon, label, isChat }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center flex-1"
          >
            {({ isActive }) =>
              isChat ? (
                /* ── Raised circle FAB for Chat ── */
                <div className="flex flex-col items-center gap-0.5 -mt-5">
                  <div className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all',
                    isActive
                      ? 'btn-uae shadow-uae scale-105'
                      : 'bg-primary/90 hover:bg-primary',
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold leading-none mt-1',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {label}
                  </span>
                </div>
              ) : (
                /* ── Regular nav item ── */
                <div className={cn(
                  'flex flex-col items-center gap-0.5 py-2 w-full transition-all',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}>
                  <div className={cn('p-1.5 rounded-xl transition-colors', isActive && 'bg-primary/10')}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn('text-[10px] font-medium leading-none', isActive && 'text-primary')}>
                    {label}
                  </span>
                </div>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
