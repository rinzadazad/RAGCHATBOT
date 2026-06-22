import { Outlet } from 'react-router-dom'
import { Shield, Lock, Cpu } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'

const features = [
  { icon: Shield, text: 'Your documents never leave your account' },
  { icon: Lock,   text: 'End-to-end secured with JWT authentication' },
  { icon: Cpu,    text: 'Powered by state-of-the-art RAG technology' },
]

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel — UAE Emirates Green ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 auth-panel-left flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%),
              repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        {/* UAE Gold accent bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, #C9A84C, #F0D080, #C9A84C)' }}
        />

        <div className="relative z-10 text-white max-w-sm text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-uae-lg">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                <path d="M8 10h8v4H8z" opacity=".4"/>
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-black tracking-tight mb-2">RINZ Chatbot</h1>
          <p className="text-white/75 text-sm font-light mb-1" style={{ fontWeight: 300 }}>
            AI-Powered Knowledge Assistant
          </p>

          {/* UAE Gold separator */}
          <div className="mx-auto my-8 w-24 h-0.5 rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }}
          />

          <div className="space-y-5 text-left">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/12 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-white/85 leading-snug">{text}</p>
              </div>
            ))}
          </div>

          {/* UAE Gold footer line */}
          <p className="mt-12 text-xs text-white/40 tracking-widest uppercase">
            Secure · Private · Intelligent
          </p>
        </div>

        {/* UAE Gold accent bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, #C9A84C, #F0D080, #C9A84C)' }}
        />
      </div>

      {/* ── Right Panel — Form ────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-background">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
          <div className="w-9 h-9 rounded-xl btn-uae flex items-center justify-center shadow-uae">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <h1 className="text-xl font-black tracking-tight">RINZ Chatbot</h1>
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>

        <p className="mt-8 text-xs text-muted-foreground text-center">
          UAE AI Knowledge Platform · All rights reserved
        </p>
      </div>

      <Toaster />
    </div>
  )
}
