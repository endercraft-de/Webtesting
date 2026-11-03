import { Search, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, TOOLS, type Tool } from '../tools/registry'

function ToolCard({ t }: { t: Tool }) {
  const Icon = t.icon
  return (
    <Link
      to={`/${t.slug}`}
      onMouseEnter={() => t.load()}
      className="group flex items-start gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 hover:ring-brand-200 sm:p-5"
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110 ${t.tone}`}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">{t.title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-slate-500">{t.description}</span>
      </span>
    </Link>
  )
}

export default function Home() {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return null
    return TOOLS.filter((t) => `${t.title} ${t.description} ${t.keywords ?? ''}`.toLowerCase().includes(s))
  }, [q])

  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,theme(colors.brand.100),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-14 text-center sm:px-6 sm:pb-16 sm:pt-20">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
            <Sparkles className="size-3.5" /> {TOOLS.length} Werkzeuge · kostenlos · ohne Limits
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Alles, was du mit PDFs
            <br className="hidden sm:block" /> erledigen musst.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500 sm:text-lg">Zusammenfügen, teilen, bearbeiten, unterschreiben und komprimieren – direkt im Browser, ohne dass Dateien deinen Rechner verlassen.</p>
          <div className="relative mx-auto mt-8 max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Werkzeug suchen, z. B. „zusammenfügen“"
              className="h-12 w-full rounded-2xl border-0 bg-white pl-12 pr-4 text-base shadow-sm ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-500" /> 100 % lokal verarbeitet
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="size-4 text-amber-500" /> Kein Upload, keine Wartezeit
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {filtered ? (
          filtered.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((t) => (
                <ToolCard key={t.slug} t={t} />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500">Kein Werkzeug gefunden für „{q}“.</p>
          )
        ) : (
          <div className="space-y-12">
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Beliebt</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {TOOLS.filter((t) => t.popular).map((t) => (
                  <ToolCard key={t.slug} t={t} />
                ))}
              </div>
            </div>
            {CATEGORIES.map((c) => (
              <div key={c}>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">{c}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {TOOLS.filter((t) => t.category === c).map((t) => (
                    <ToolCard key={t.slug} t={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
