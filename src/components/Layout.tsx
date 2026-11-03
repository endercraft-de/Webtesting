import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { TOOLS } from '../tools/registry'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-semibold text-slate-900">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm shadow-brand-600/40">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      </span>
      <span className="text-[17px] tracking-tight">
        PDF<span className="text-brand-600">werk</span>
      </span>
    </Link>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const quick = TOOLS.filter((t) => t.popular).slice(0, 5)
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {quick.map((t) => (
              <NavLink
                key={t.slug}
                to={`/${t.slug}`}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
                }
              >
                {((x) => x[0].toUpperCase() + x.slice(1))(t.title.replace(/^PDF /, '').replace(/^Seiten /, ''))}
              </NavLink>
            ))}
          </nav>
          <Link to="/" className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
            Alle Werkzeuge
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-500" />
            Alle Dateien werden ausschließlich lokal in deinem Browser verarbeitet – nichts wird hochgeladen.
          </span>
          <span>PDFwerk · interne Nutzung</span>
        </div>
      </footer>
    </div>
  )
}
