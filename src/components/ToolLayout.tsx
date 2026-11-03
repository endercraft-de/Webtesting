import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Tool } from '../tools/registry'
import { cx } from './ui'

export function ToolHeader({ tool, compact }: { tool: Tool; compact?: boolean }) {
  const Icon = tool.icon
  return (
    <div className={cx('flex items-center gap-4', compact ? 'mb-4' : 'mb-8 flex-col text-center sm:mb-10')}>
      <div className={cx('flex shrink-0 items-center justify-center rounded-2xl', tool.tone, compact ? 'size-10' : 'size-14')}>
        <Icon className={compact ? 'size-5' : 'size-7'} />
      </div>
      <div className={compact ? 'min-w-0' : ''}>
        <h1 className={cx('font-bold tracking-tight text-slate-900', compact ? 'truncate text-lg' : 'text-2xl sm:text-3xl')}>{tool.title}</h1>
        <p className={cx('text-slate-500', compact ? 'hidden truncate text-sm sm:block' : 'mx-auto mt-2 max-w-xl text-base')}>{tool.description}</p>
      </div>
    </div>
  )
}

/** Upload screen container */
export function UploadStage({ tool, children, note }: { tool: Tool; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Alle Werkzeuge
      </Link>
      <ToolHeader tool={tool} />
      {children}
      {note && <div className="mt-6 text-center text-sm text-slate-500">{note}</div>}
    </div>
  )
}

/**
 * Two-column workspace: preview on the left, options on the right.
 * On mobile the options stack below and the primary action sticks to the bottom.
 */
export function Workspace({
  tool,
  toolbar,
  main,
  side,
  action,
  onReset,
}: {
  tool: Tool
  toolbar?: ReactNode
  main: ReactNode
  side?: ReactNode
  action?: ReactNode
  onReset?: () => void
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <ToolHeader tool={tool} compact />
        {onReset && (
          <button onClick={onReset} className="mb-4 shrink-0 rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
            Neu starten
          </button>
        )}
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-1 rounded-2xl bg-white p-3 ring-1 ring-slate-200 sm:p-5">
          {toolbar && <div className="sticky top-14 z-20 -mx-3 -mt-3 mb-4 flex flex-wrap items-center gap-2 rounded-t-2xl border-b border-slate-100 bg-white/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:-mt-5 sm:px-5">{toolbar}</div>}
          {main}
        </section>
        {(side || action) && (
          <aside className="lg:sticky lg:top-20 lg:w-80 lg:shrink-0">
            <div className="space-y-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              {side}
              {action && <div className="hidden lg:block">{action}</div>}
            </div>
          </aside>
        )}
      </div>
      {action && (
        <>
          <div className="h-20 lg:hidden" />
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 p-3 backdrop-blur lg:hidden">{action}</div>
        </>
      )}
    </div>
  )
}
