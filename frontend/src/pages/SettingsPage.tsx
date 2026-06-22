import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, Cpu, Database, Info, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { settingsService } from '@/services/settingsService'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Settings } from '@/types'

/* ── Per-setting metadata ─────────────────────────────────────────── */
type Zone = { from: number; to: number; label: string; color: string; tip: string }

const ZONES: Record<string, Zone[]> = {
  temperature: [
    { from: 0,   to: 0.3, label: 'Very Precise',  color: 'text-primary',      tip: 'Deterministic — same answer every time. Best for factual lookups and exact data retrieval.' },
    { from: 0.3, to: 0.7, label: 'Balanced',       color: 'text-green-400',    tip: 'Consistent yet natural. Recommended for most Q&A and summarisation tasks.' },
    { from: 0.7, to: 1.2, label: 'Creative',       color: 'text-yellow-400',   tip: 'Varied phrasing and ideas. Good for brainstorming, drafting, and summaries.' },
    { from: 1.2, to: 2.0, label: 'Very Creative',  color: 'text-orange-400',   tip: 'Highly random output. May produce less accurate or inconsistent answers. Use with care.' },
  ],
  top_p: [
    { from: 0,    to: 0.5,  label: 'Very Focused',  color: 'text-primary',    tip: 'Only the most probable words are chosen. Answers are terse and predictable.' },
    { from: 0.5,  to: 0.8,  label: 'Focused',       color: 'text-green-400',  tip: 'Moderate vocabulary range. Good for structured, professional responses.' },
    { from: 0.8,  to: 0.95, label: 'Natural',       color: 'text-yellow-400', tip: 'Recommended default (0.9). Natural language with good diversity.' },
    { from: 0.95, to: 1.0,  label: 'Full Range',    color: 'text-orange-400', tip: 'All vocabulary is considered. More diverse but less predictable output.' },
  ],
  chunk_size: [
    { from: 100,  to: 350,  label: 'Very Small',  color: 'text-primary',    tip: 'Precise retrieval, but may miss surrounding context. Good for short structured documents.' },
    { from: 350,  to: 700,  label: 'Small',       color: 'text-green-400',  tip: 'Good for FAQs and structured content. Balances precision and context.' },
    { from: 700,  to: 1200, label: 'Medium',      color: 'text-yellow-400', tip: 'Recommended for most documents. Includes enough context per chunk for meaningful answers.' },
    { from: 1200, to: 2000, label: 'Large',       color: 'text-orange-400', tip: 'More context per chunk but fewer chunks retrieved. Best for long-form prose.' },
  ],
  chunk_overlap: [
    { from: 0,   to: 30,  label: 'No Overlap',     color: 'text-primary',    tip: 'Fastest indexing. Risk of cutting sentences at chunk boundaries.' },
    { from: 30,  to: 100, label: 'Low Overlap',    color: 'text-green-400',  tip: 'Minimises boundary loss. Good starting point for most documents.' },
    { from: 100, to: 200, label: 'Medium Overlap', color: 'text-yellow-400', tip: 'Recommended default. Ensures context continuity across chunk edges.' },
    { from: 200, to: 500, label: 'High Overlap',   color: 'text-orange-400', tip: 'Maximum context continuity. Increases index size and processing time.' },
  ],
  top_k: [
    { from: 1,  to: 3,  label: 'Very Few',   color: 'text-primary',    tip: 'Fastest answers using only the top 1–2 most relevant chunks. Very focused.' },
    { from: 3,  to: 7,  label: 'Standard',   color: 'text-green-400',  tip: 'Recommended (3–6 chunks). Balances relevance and coverage for most questions.' },
    { from: 7,  to: 13, label: 'Broad',      color: 'text-yellow-400', tip: 'More context is included. Useful for complex multi-part questions.' },
    { from: 13, to: 20, label: 'Maximum',    color: 'text-orange-400', tip: 'All retrieved chunks are used. May dilute relevance with loosely related content.' },
  ],
  similarity_threshold: [
    { from: 0,    to: 0.3,  label: 'Loose Match',   color: 'text-orange-400', tip: 'Includes weakly related chunks. Higher recall, lower precision. May introduce noise.' },
    { from: 0.3,  to: 0.55, label: 'Balanced',      color: 'text-green-400',  tip: 'Recommended default. Good balance between finding results and staying on-topic.' },
    { from: 0.55, to: 0.75, label: 'Strict Match',  color: 'text-yellow-400', tip: 'Only closely matching chunks pass. High precision; may miss edge-case answers.' },
    { from: 0.75, to: 1.0,  label: 'Exact Match',   color: 'text-primary',    tip: 'Very strict. Some queries may return no results if phrasing differs from documents.' },
  ],
}

const DESCRIPTIONS: Record<string, { what: string; effect: string }> = {
  temperature:          { what: 'Controls how random or deterministic the AI\'s word choices are.',                                           effect: 'Low = predictable & factual. High = creative & varied.' },
  top_p:                { what: 'Limits token selection to the top-P most probable words (nucleus sampling).',                                effect: 'Lower = terse & focused. Higher = more natural & diverse.' },
  chunk_size:           { what: 'Number of characters per text chunk when your documents are split for indexing.',                            effect: 'Smaller chunks = precise but narrow. Larger = more context per result.' },
  chunk_overlap:        { what: 'How many characters are shared between consecutive chunks.',                                                  effect: 'More overlap = fewer broken sentences at boundaries. More storage used.' },
  top_k:                { what: 'How many document chunks are fetched from the vector store per question.',                                   effect: 'More chunks = broader coverage. Fewer = tighter, faster answers.' },
  similarity_threshold: { what: 'Minimum cosine similarity a chunk must have to the question before it is sent to the AI.',                  effect: 'Higher = fewer but more relevant chunks. Lower = more results but noisier.' },
  max_tokens:           { what: 'Maximum number of tokens the AI can generate in a single response.',                                         effect: 'Higher = longer answers. Lower = shorter, faster responses.' },
}

function getZone(key: string, value: number): Zone | null {
  return ZONES[key]?.find((z) => value >= z.from && value <= z.to) ?? ZONES[key]?.[ZONES[key].length - 1] ?? null
}

/* ── Slider with live zone badge ──────────────────────────────────── */
function SliderField({
  fieldKey, label, value, min, max, step, onChange,
}: {
  fieldKey: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  const [open, setOpen] = useState(false)
  const zone = getZone(fieldKey, value)
  const desc = DESCRIPTIONS[fieldKey]
  const pct  = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
      {/* Row 1: label + zone badge + value */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold">{label}</span>
          {zone && (
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full bg-muted border border-border', zone.color)}>
              {zone.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-mono font-bold tabular-nums bg-primary/10 text-primary px-2 py-0.5 rounded-md">
            {value}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn('p-1 rounded-md transition-colors', open ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
            title="What does this setting do?"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Slider */}
      <div className="relative pt-1">
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%, hsl(var(--secondary)) 100%)`,
          }}
        />
        {/* Min / Max labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{min}</span>
          <span className="text-[10px] text-muted-foreground">{max}</span>
        </div>
      </div>

      {/* Live zone tip */}
      {zone && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className={cn('font-medium', zone.color)}>{zone.label}:</span>{' '}
          {zone.tip}
        </p>
      )}

      {/* Expandable full description */}
      {open && desc && (
        <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5 animate-fade-in">
          <p className="text-xs leading-relaxed">
            <span className="font-semibold text-foreground">What it does: </span>
            <span className="text-muted-foreground">{desc.what}</span>
          </p>
          <p className="text-xs leading-relaxed">
            <span className="font-semibold text-foreground">Effect: </span>
            <span className="text-muted-foreground">{desc.effect}</span>
          </p>
          {/* Zone legend */}
          {ZONES[fieldKey] && (
            <div className="pt-1.5 border-t border-border/50 grid grid-cols-2 gap-1.5">
              {ZONES[fieldKey].map((z) => (
                <div key={z.label} className="flex items-start gap-1.5">
                  <span className={cn('text-[10px] font-semibold mt-0.5 flex-shrink-0', z.color)}>■</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    <span className={cn('font-medium', z.color)}>{z.label}</span>{' '}
                    ({z.from}–{z.to})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Info box for non-slider fields ──────────────────────────────── */
function InfoBox({ fieldKey }: { fieldKey: string }) {
  const [open, setOpen] = useState(false)
  const desc = DESCRIPTIONS[fieldKey]
  if (!desc) return null
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
      >
        <Info className="w-3 h-3" />
        {open ? 'Hide details' : 'What does this affect?'}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1 animate-fade-in">
          <p className="text-xs leading-relaxed">
            <span className="font-semibold text-foreground">What it does: </span>
            <span className="text-muted-foreground">{desc.what}</span>
          </p>
          <p className="text-xs leading-relaxed">
            <span className="font-semibold text-foreground">Effect: </span>
            <span className="text-muted-foreground">{desc.effect}</span>
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────────── */
export function SettingsPage() {
  const [form, setForm]     = useState<Partial<Settings>>({})
  const [saving, setSaving] = useState(false)
  const { toast }           = useToast()
  const queryClient         = useQueryClient()
  const { user }            = useAuthStore()
  const userId              = user?.id

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', userId],
    queryFn: settingsService.get,
    enabled: !!userId,
  })

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: settingsService.getModels,
  })

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsService.update(form)
      queryClient.invalidateQueries({ queryKey: ['settings', userId] })
      toast({ title: 'Settings saved successfully' })
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
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0 gap-3">
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-tight">Settings</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Click <Info className="inline w-3 h-3 mx-0.5" /> on any setting to learn what it does</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 btn-uae text-white border-0 flex-shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="hidden sm:inline">Save Changes</span>
          <span className="sm:hidden">Save</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ── LLM Settings ─────────────────────────────────── */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Language Model</CardTitle>
                  <CardDescription className="text-xs">Controls how the AI generates responses</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Model selector */}
              <div className="rounded-xl border border-border/60 p-4 bg-muted/20 space-y-2">
                <label className="text-sm font-semibold">Model</label>
                <select
                  value={form.model_name ?? ''}
                  onChange={(e) => set('model_name', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.description} ({(m.context_window / 1000).toFixed(0)}k ctx)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Larger context windows can handle longer documents but may be slower to respond.
                </p>
              </div>

              <SliderField
                fieldKey="temperature"
                label="Temperature"
                value={form.temperature ?? 0.7}
                min={0} max={2} step={0.1}
                onChange={(v) => set('temperature', v)}
              />

              {/* Max Tokens */}
              <div className="rounded-xl border border-border/60 p-4 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Max Tokens</label>
                  <span className="text-sm font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                    {form.max_tokens ?? 2048}
                  </span>
                </div>
                <Input
                  type="number"
                  value={form.max_tokens ?? 2048}
                  onChange={(e) => set('max_tokens', Number(e.target.value))}
                  min={128} max={32768} step={128}
                  className="h-9"
                />
                <div className="flex gap-4 text-[10px] text-muted-foreground mt-1">
                  {[512, 1024, 2048, 4096, 8192].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set('max_tokens', v)}
                      className={cn(
                        'px-1.5 py-0.5 rounded border transition-colors',
                        (form.max_tokens ?? 2048) === v
                          ? 'border-primary text-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <InfoBox fieldKey="max_tokens" />
              </div>

              <SliderField
                fieldKey="top_p"
                label="Top P (Nucleus Sampling)"
                value={form.top_p ?? 0.9}
                min={0} max={1} step={0.05}
                onChange={(v) => set('top_p', v)}
              />
            </CardContent>
          </Card>

          {/* ── RAG Settings ─────────────────────────────────── */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Retrieval & Indexing</CardTitle>
                  <CardDescription className="text-xs">Controls how documents are split and searched</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SliderField
                fieldKey="chunk_size"
                label="Chunk Size"
                value={form.chunk_size ?? 512}
                min={100} max={2000} step={50}
                onChange={(v) => set('chunk_size', v)}
              />
              <SliderField
                fieldKey="chunk_overlap"
                label="Chunk Overlap"
                value={form.chunk_overlap ?? 50}
                min={0} max={500} step={10}
                onChange={(v) => set('chunk_overlap', v)}
              />
              <SliderField
                fieldKey="top_k"
                label="Top K Retrieval"
                value={form.top_k ?? 5}
                min={1} max={20} step={1}
                onChange={(v) => set('top_k', v)}
              />
              <SliderField
                fieldKey="similarity_threshold"
                label="Similarity Threshold"
                value={form.similarity_threshold ?? 0.3}
                min={0} max={1} step={0.05}
                onChange={(v) => set('similarity_threshold', v)}
              />

              {/* Note about chunk settings */}
              <div className="flex gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p>Changes to <strong className="text-foreground">Chunk Size</strong> and <strong className="text-foreground">Chunk Overlap</strong> only apply to documents uploaded <em>after</em> saving. Re-index existing documents in the Knowledge Base to apply new chunk settings.</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
