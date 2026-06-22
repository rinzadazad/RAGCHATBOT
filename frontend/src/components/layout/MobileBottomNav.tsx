import { NavLink } from 'react-router-dom'
import { House, MessageSquare, FileText, Search, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/home',      icon: House,         label: 'Home'      },
  { to: '/chat',      icon: MessageSquare, label: 'Chat'      },
  { to: '/documents', icon: FileText,      label: 'Docs'      },
  { to: '/search',    icon: Search,        label: 'Search'    },
  { to: '/settings',  icon: Settings,      label: 'Settings'  },
]

export function MobileBottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all flex-1',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('p-1.5 rounded-xl transition-colors', isActive && 'bg-primary/10')}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn('text-[10px] font-medium leading-none', isActive && 'text-primary')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
