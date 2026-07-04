import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authService } from '@/services/authService'
import { useToast } from '@/hooks/use-toast'

export function ForgotPasswordPage() {
  const [email, setEmail]                 = useState('')
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const { toast }  = useToast()
  const navigate    = useNavigate()

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    if (!passwordsMatch) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword(email.trim(), newPassword)
      toast({ title: 'Password updated', description: 'You can now sign in with your new password' })
      navigate('/login')
    } catch (err: any) {
      toast({
        title: 'Reset failed',
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
        <h1 className="text-xl font-black text-white">Reset password</h1>
        <p className="text-white/65 text-sm mt-0.5">Enter your email and choose a new password</p>
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
          <label className="text-sm font-semibold" htmlFor="newPassword">New password</label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
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

        <div className="space-y-1.5">
          <label className="text-sm font-semibold" htmlFor="confirmPassword">Confirm new password</label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="h-10 focus-visible:ring-primary"
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button type="submit" className="w-full h-10 btn-uae text-white border-0" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Reset Password
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Remembered your password?{' '}
          <Link to="/login" className="text-primary hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
