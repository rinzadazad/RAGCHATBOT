import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Toaster } from '@/components/ui/toaster'

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      {/*
        On mobile the bottom nav is 64px (h-16) + device safe-area-inset-bottom.
        We add equivalent padding here so content isn't hidden behind the nav bar.
        On md+ the nav is hidden so no padding needed.
      */}
      <main
        className="flex-1 overflow-hidden md:pb-0"
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Remove safe-area padding on desktop via inline style override */}
        <style>{`@media (min-width: 768px) { main { padding-bottom: 0 !important; } }`}</style>
        <Outlet />
      </main>
      <MobileBottomNav />
      <Toaster />
    </div>
  )
}
