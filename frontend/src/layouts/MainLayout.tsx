import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Toaster } from '@/components/ui/toaster'

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      {/* pb-16 reserves space for the mobile bottom nav bar */}
      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav />
      <Toaster />
    </div>
  )
}
