import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { authService } from '@/services/authService'
import { useToast } from '@/hooks/use-toast'

export function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]     = useState(false)
  const { setAuth }       = useAuthStore()
  const { resetChatStore } = useChatStore()
  const { toast }         = useToast()
  const navigate          = useNavigate()
  const queryClient       = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await authService.login(email, password)
      queryClient.clear()
      resetChatStore()
      setAuth(data.user, data.access_token)
      navigate('/home')
    } catch (err: any) {
      toast({
        title: 'Login failed',
        description: err.response?.data?.detail ?? 'Invalid credentials',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-uae-lg overflow-hidden">
      {/* UAE green header band */}
      <div className="sidebar-brand px-6 py-5">
        <h1 className="text-xl font-black text-white">Welcome back</h1>
        <p className="text-white/65 text-sm mt-0.5">Sign in to your account to continue</p>
      </div>
      {/* UAE Gold accent line */}
      <div className="uae-gold-bar" />

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold" htmlFor="email">Email address</label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-10 focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold" htmlFor="password">Password</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-10 pr-10 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-10 btn-uae text-white border-0" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Sign In
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-semibold">
            Create one
          </Link>
        </p>
      </form>
    </div>
  )
}
