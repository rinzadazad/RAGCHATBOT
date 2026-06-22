import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { useToast } from '@/hooks/use-toast'

export function RegisterPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched]   = useState({ name: false, email: false, password: false })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { setAuth } = useAuthStore()
  const { toast }   = useToast()
  const navigate    = useNavigate()

  const nameError     = touched.name     && name.trim().length < 2           ? 'Name must be at least 2 characters'   : ''
  const emailError    = touched.email    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Enter a valid email address' : ''
  const passwordError = touched.password && password.length < 6              ? 'Password must be at least 6 characters': ''
  const isFormValid   = name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, email: true, password: true })
    if (!isFormValid) return
    setLoading(true)
    try {
      const data = await authService.register(name.trim(), email.trim(), password)
      setAuth(data.user, data.access_token)
      navigate('/chat')
    } catch (err: any) {
      toast({
        title: 'Registration failed',
        description: err.response?.data?.detail ?? 'Something went wrong',
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
        <h1 className="text-xl font-black text-white">Create account</h1>
        <p className="text-white/65 text-sm mt-0.5">Get started with your AI knowledge assistant</p>
      </div>
      {/* UAE Gold accent line */}
      <div className="uae-gold-bar" />

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold" htmlFor="name">Full Name</label>
          <Input
            id="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            className={`h-10 ${nameError ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
            required
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold" htmlFor="email">Email address</label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            className={`h-10 ${emailError ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
            required
          />
          {emailError && <p className="text-xs text-destructive">{emailError}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold" htmlFor="password">Password</label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              className={`h-10 pr-10 ${passwordError ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordError
            ? <p className="text-xs text-destructive">{passwordError}</p>
            : <p className="text-xs text-muted-foreground">At least 6 characters</p>
          }
        </div>

        <div className="pt-1 space-y-4">
          <Button type="submit" className="w-full h-10 btn-uae text-white border-0" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Account
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
          </p>
        </div>
      </form>
    </div>
  )
}
