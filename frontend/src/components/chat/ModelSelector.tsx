import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { settingsService } from '@/services/settingsService'
import { cn } from '@/lib/utils'
import type { ModelInfo } from '@/types'

interface Props {
  value: string
  onChange: (model: string) => void
}

export function ModelSelector({ value, onChange }: Props) {
  const { data: models = [] } = useQuery<ModelInfo[]>({
    queryKey: ['models'],
    queryFn: () => settingsService.getModels(),
  })

  const current = models.find((m) => m.id === value)

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 text-xs bg-secondary hover:bg-accent rounded-md px-3 py-1.5 transition-colors border border-border">
        <span className="font-medium">{current?.description ?? value}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-50 py-1 hidden group-hover:block">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onChange(model.id)}
            className={cn(
              'w-full text-left px-3 py-2 hover:bg-accent transition-colors',
              model.id === value && 'bg-primary/10 text-primary'
            )}
          >
            <p className="text-sm font-medium">{model.description}</p>
            <p className="text-xs text-muted-foreground">{(model.context_window / 1000).toFixed(0)}k context</p>
          </button>
        ))}
      </div>
    </div>
  )
}
