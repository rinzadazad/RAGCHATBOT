import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus cancel button when dialog opens; close on Escape
  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  // Prevent body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const isDestructive = variant === 'destructive'

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full max-w-sm rounded-2xl border shadow-2xl',
          'bg-card animate-fade-in',
          isDestructive ? 'border-destructive/20' : 'border-amber-500/20',
        )}
        style={{ animationDuration: '0.18s' }}
      >
        {/* Top accent bar */}
        <div
          className={cn(
            'h-1 w-full rounded-t-2xl',
            isDestructive
              ? 'bg-gradient-to-r from-destructive/60 via-destructive to-destructive/60'
              : 'bg-gradient-to-r from-amber-400/60 via-amber-400 to-amber-400/60',
          )}
        />

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center',
                isDestructive ? 'bg-destructive/10' : 'bg-amber-400/10',
              )}
            >
              <AlertTriangle
                className={cn(
                  'w-7 h-7',
                  isDestructive ? 'text-destructive' : 'text-amber-400',
                )}
              />
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2 mb-6">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold tracking-tight"
            >
              {title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              ref={cancelRef}
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              className={cn(
                'flex-1 gap-2',
                isDestructive
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0'
                  : 'bg-amber-500 hover:bg-amber-400 text-white border-0',
              )}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
