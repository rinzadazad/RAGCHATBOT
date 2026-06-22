import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, FileText, Search, Settings,
  Upload, Sparkles, ShieldCheck, Zap,
  ArrowRight, BookOpen, Brain, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { documentService } from '@/services/documentService'

/* ── Small reusable pieces ─────────────────────────────────────── */

function FeatureCard({ icon: Icon, title, body, color }: {
  icon: React.ElementType; title: string; body: string; color: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 flex gap-4 hover:border-primary/30 hover:bg-card transition-all group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full btn-uae flex items-center justify-center text-white text-sm font-bold shadow-uae">
        {n}
      </div>
      <div className="pt-0.5">
        <h4 className="font-semibold text-sm mb-0.5">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────── */

export function HomePage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const { data: stats } = useQuery({
    queryKey: ['document-stats', user?.id],
    queryFn: documentService.getStats,
    enabled: !!user?.id,
  })

  const statItems = [
    { label: 'Documents indexed',   value: stats?.total_documents ?? '—', icon: FileText   },
    { label: 'Text chunks stored',  value: stats?.total_chunks    ?? '—', icon: BookOpen   },
    { label: 'Vectors in database', value: stats?.vector_count    ?? '—', icon: BarChart3  },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border">
        {/* Background gradient */}
        <div
          className="absolute inset-0 opacity-10 dark:opacity-20"
          style={{ background: 'radial-gradient(ellipse at 60% 0%, hsl(var(--primary)) 0%, transparent 65%)' }}
        />
        {/* UAE Gold top bar */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />

        <div className="relative px-6 sm:px-10 py-10 sm:py-14 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-2xl btn-uae flex items-center justify-center shadow-uae flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="uae-gold-bar h-6 w-px mx-1" />
            <span className="text-sm text-muted-foreground font-medium">AI Knowledge Assistant</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 leading-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl mb-8">
            RINZ Chatbot reads your documents and answers your questions —
            accurately, instantly, and only from content you uploaded.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate('/chat')}
              className="btn-uae text-white border-0 gap-2 shadow-uae"
            >
              <MessageSquare className="w-4 h-4" />
              Start Chatting
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/documents')}
              className="gap-2 border-border hover:border-primary/40"
            >
              <Upload className="w-4 h-4" />
              Upload Documents
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 sm:px-10 py-8 max-w-4xl mx-auto w-full space-y-10">

        {/* ── Stats row ─────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {statItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-border/60 bg-card/60 p-4 text-center">
                <Icon className="w-4 h-4 text-primary mx-auto mb-2 opacity-70" />
                <p className="text-2xl font-black text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── What is this? ──────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            What is RINZ Chatbot?
          </h2>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">RINZ Chatbot</strong> is your personal AI assistant that reads
              your own documents — PDFs, Word files, websites, or plain text — and answers questions about them.
            </p>
            <p>
              Unlike general AI tools, this chatbot <strong className="text-foreground">only uses what you upload</strong>.
              That means answers are always based on your actual content, not guesswork or the internet.
              Think of it as a smart search engine that can actually read and understand your files.
            </p>
            <p>
              This technology is called <strong className="text-foreground">RAG (Retrieval-Augmented Generation)</strong> —
              the AI retrieves the most relevant parts of your documents and generates a clear, accurate answer.
            </p>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            What can you do?
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <FeatureCard
              icon={Upload}
              title="Upload any document"
              body="Upload PDFs, Word docs, paste text, or add a website URL. The AI will read, split, and index the content so it can be searched instantly."
              color="bg-primary/10 text-primary"
            />
            <FeatureCard
              icon={MessageSquare}
              title="Ask questions in plain English"
              body="Type any question naturally — no special commands needed. Get clear answers with the exact source from your documents highlighted."
              color="bg-green-500/10 text-green-500"
            />
            <FeatureCard
              icon={Search}
              title="Search past conversations"
              body="Every question and answer is saved. Use the Search page to find any previous conversation or answer in seconds."
              color="bg-blue-500/10 text-blue-500"
            />
            <FeatureCard
              icon={Settings}
              title="Fine-tune the AI behaviour"
              body="Adjust Temperature, Top K, Similarity Threshold and more from the Settings page. Each setting has a plain-English explanation."
              color="bg-amber-500/10 text-amber-500"
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Your data stays private"
              body="Documents and conversations are tied to your account only. Other users cannot see your uploads or chat history."
              color="bg-purple-500/10 text-purple-500"
            />
            <FeatureCard
              icon={Sparkles}
              title="Web search fallback"
              body="If no answer is found in your documents, the chatbot can optionally search the internet and clearly tell you the source is external."
              color="bg-cyan-500/10 text-cyan-500"
            />
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            How to get started — 3 simple steps
          </h2>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 space-y-6">
            <Step
              n={1}
              title="Upload your documents"
              body='Go to the Knowledge Base page. Upload a PDF, paste a website URL, or type/paste any text. Click "Index" and wait a few seconds while the AI processes it.'
            />
            {/* connector line */}
            <div className="ml-4 h-4 w-px bg-border" />
            <Step
              n={2}
              title="Ask a question"
              body='Go to the Chat page and type your question exactly as you would ask a colleague. The AI finds the most relevant parts of your documents and answers.'
            />
            <div className="ml-4 h-4 w-px bg-border" />
            <Step
              n={3}
              title="Review the answer and sources"
              body="Each answer includes which document and section it came from. You can click source links to verify the original text."
            />
          </div>
        </section>

        {/* ── Tips ───────────────────────────────────────────── */}
        <section className="pb-6">
          <h2 className="text-lg font-bold mb-4">💡 Quick tips</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              'Ask specific questions — "What is the check-out time?" works better than "Tell me everything".',
              'If the AI says it cannot find the answer, try re-wording your question or check that the right document is uploaded.',
              'Use the Sources selector in the chat bar to limit search to one specific document.',
              'Re-index a document in Knowledge Base if you changed chunk settings in Settings.',
              'Dark mode / Light mode can be toggled in the sidebar bottom left.',
            ].map((tip) => (
              <li key={tip} className="flex gap-2 items-start">
                <span className="text-primary mt-0.5 flex-shrink-0">›</span>
                {tip}
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  )
}
