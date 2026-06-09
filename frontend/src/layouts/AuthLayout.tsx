import { Outlet } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">RINZ Chatbot</h1>
        </div>
        <Outlet />
      </div>
      <Toaster />
    </div>
  )
}
