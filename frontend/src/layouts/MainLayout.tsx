import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from '@/components/ui/toaster'

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
