import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Toaster } from '@/components/ui/toaster'

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>

        {/*
          Spacer that matches the MobileBottomNav height on mobile so
          page content is never hidden behind the fixed bottom bar.
          Hidden on md+ because the bottom nav is hidden there too.
        */}
        <div
          className="flex-shrink-0 md:hidden"
          style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        />
      </div>

      <MobileBottomNav />
      <Toaster />
    </div>
  )
}
