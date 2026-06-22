import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Toaster } from '@/components/ui/toaster'

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <style>{`@media (min-width: 768px) { .main-col { padding-bottom: 0 !important; } }`}</style>
        <TopBar />
        <main className="flex-1 overflow-hidden main-col">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <Toaster />
    </div>
  )
}
