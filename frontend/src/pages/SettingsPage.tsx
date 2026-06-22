import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, Cpu, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { settingsService } from '@/services/settingsService'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import type { Settings } from '@/types'

function SliderField({
  label, value, min, max, step, onChange, description,
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; description?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

export function SettingsPage() {
  const [form, setForm] = useState<Partial<Settings>>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const userId = user?.id

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', userId],
    queryFn: settingsService.get,
    enabled: !!userId,
  })

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: settingsService.getModels,
  })

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsService.update(form)
      queryClient.invalidateQueries({ queryKey: ['settings', userId] })
      toast({ title: 'Settings saved', variant: 'default' })
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Settings, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
        <h1 className="font-semibold text-lg">Settings</h1>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* LLM Settings */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">LLM Settings</CardTitle>
              </div>
              <CardDescription>Configure the language model behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <select
                  value={form.model_name ?? ''}
                  onChange={(e) => set('model_name', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.description} ({(m.context_window / 1000).toFixed(0)}k ctx)</option>
                  ))}
                </select>
              </div>

              <SliderField
                label="Temperature"
                value={form.temperature ?? 0.7}
                min={0} max={2} step={0.1}
                onChange={(v) => set('temperature', v)}
                description="Higher = more creative; lower = more focused"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Max Tokens</label>
                  <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{form.max_tokens ?? 2048}</span>
                </div>
                <Input
                  type="number"
                  value={form.max_tokens ?? 2048}
                  onChange={(e) => set('max_tokens', Number(e.target.value))}
                  min={1} max={32768} step={128}
                  className="h-9"
                />
              </div>

              <SliderField
                label="Top P"
                value={form.top_p ?? 0.9}
                min={0} max={1} step={0.05}
                onChange={(v) => set('top_p', v)}
                description="Nucleus sampling probability"
              />
            </CardContent>
          </Card>

          {/* RAG Settings */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">RAG Settings</CardTitle>
              </div>
              <CardDescription>Configure retrieval-augmented generation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <SliderField
                label="Chunk Size"
                value={form.chunk_size ?? 512}
                min={100} max={2000} step={50}
                onChange={(v) => set('chunk_size', v)}
                description="Characters per text chunk for indexing"
              />

              <SliderField
                label="Chunk Overlap"
                value={form.chunk_overlap ?? 50}
                min={0} max={500} step={10}
                onChange={(v) => set('chunk_overlap', v)}
                description="Overlap between consecutive chunks"
              />

              <SliderField
                label="Top K Retrieval"
                value={form.top_k ?? 5}
                min={1} max={20} step={1}
                onChange={(v) => set('top_k', v)}
                description="Number of chunks to retrieve per query"
              />

              <SliderField
                label="Similarity Threshold"
                value={form.similarity_threshold ?? 0.3}
                min={0} max={1} step={0.05}
                onChange={(v) => set('similarity_threshold', v)}
                description="Minimum similarity score to include a chunk"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
