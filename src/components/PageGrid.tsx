import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PDFDocumentProxy } from '../lib/pdfjs'
import { Thumb } from './Thumb'
import { cx } from './ui'

export const gridCls = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'

export function PageCard({
  doc,
  index,
  rotation,
  label,
  selected,
  dimmed,
  tone = 'brand',
  onClick,
  overlay,
  footer,
}: {
  doc: PDFDocumentProxy | null
  index: number
  rotation?: number
  label?: ReactNode
  selected?: boolean
  dimmed?: boolean
  tone?: 'brand' | 'red'
  onClick?: (e: React.MouseEvent) => void
  overlay?: ReactNode
  footer?: ReactNode
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <div className="group relative">
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cx(
          'relative block w-full rounded-xl p-2 text-left transition sm:p-3',
          selected ? (tone === 'red' ? 'bg-red-50 ring-2 ring-red-400' : 'bg-brand-50 ring-2 ring-brand-500') : 'bg-slate-100/70 ring-1 ring-transparent',
          onClick && !selected && 'hover:bg-slate-100 hover:ring-slate-300',
        )}
      >
        <Thumb doc={doc} index={index} rotation={rotation} className={cx(dimmed && 'opacity-30 grayscale')} />
        {selected !== undefined && (
          <span
            className={cx(
              'absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border-2 transition',
              selected ? (tone === 'red' ? 'border-red-500 bg-red-500 text-white' : 'border-brand-600 bg-brand-600 text-white') : 'border-slate-300 bg-white/90 text-transparent',
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
        {overlay}
      </Tag>
      <div className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium text-slate-500">{label ?? index + 1}</div>
      {footer}
    </div>
  )
}

export function PreviewGrid({ doc, numPages }: { doc: PDFDocumentProxy; numPages: number }) {
  return (
    <div className={gridCls}>
      {Array.from({ length: numPages }, (_, i) => (
        <PageCard key={i} doc={doc} index={i} />
      ))}
    </div>
  )
}

export function SelectableGrid({
  doc,
  numPages,
  selected,
  onToggle,
  tone,
  dimSelected,
}: {
  doc: PDFDocumentProxy
  numPages: number
  selected: Set<number>
  onToggle: (i: number, shift: boolean) => void
  tone?: 'brand' | 'red'
  dimSelected?: boolean
}) {
  return (
    <div className={gridCls} onMouseDown={(e) => e.shiftKey && e.preventDefault()}>
      {Array.from({ length: numPages }, (_, i) => (
        <PageCard
          key={i}
          doc={doc}
          index={i}
          tone={tone}
          selected={selected.has(i)}
          dimmed={dimSelected && selected.has(i)}
          onClick={(e) => onToggle(i, e.shiftKey)}
        />
      ))}
    </div>
  )
}
