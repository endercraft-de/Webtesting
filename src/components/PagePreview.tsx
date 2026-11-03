import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { renderPage, type PDFDocumentProxy } from '../lib/pdfjs'
import { IconButton } from './ui'

/** Renders one page fitted to the container width; overlay receives the px-per-point scale. */
export function PagePreview({
  doc,
  index,
  maxWidth = 640,
  overlay,
}: {
  doc: PDFDocumentProxy
  index: number
  maxWidth?: number
  overlay?: (scale: number, size: { width: number; height: number }) => ReactNode
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(() => setWidth(Math.min(maxWidth, el.clientWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxWidth])

  useEffect(() => {
    if (!width) return
    let alive = true
    ;(async () => {
      const page = await doc.getPage(index + 1)
      const vp = page.getViewport({ scale: 1 })
      if (!alive) return
      setSize({ width: vp.width, height: vp.height })
      const scale = (width / vp.width) * Math.min(2, window.devicePixelRatio || 1)
      const off = document.createElement('canvas')
      await renderPage(page, scale, { canvas: off })
      if (!alive || !canvas.current) return
      const c = canvas.current
      c.width = off.width
      c.height = off.height
      c.getContext('2d')!.drawImage(off, 0, 0)
    })()
    return () => {
      alive = false
    }
  }, [doc, index, width])

  const scale = size ? width / size.width : 0
  return (
    <div ref={wrap} className="flex w-full justify-center">
      <div className="relative select-none shadow-[0_2px_12px_rgba(15,23,42,.15)]" style={{ width, height: size ? size.height * scale : width * 1.414 }}>
        <canvas ref={canvas} className="absolute inset-0 h-full w-full bg-white" />
        {size && overlay?.(scale, size)}
      </div>
    </div>
  )
}

export function PagePager({ index, total, onChange }: { index: number; total: number; onChange: (i: number) => void }) {
  if (total < 2) return null
  return (
    <div className="flex items-center gap-1 text-sm text-slate-600">
      <IconButton title="Vorherige Seite" disabled={index === 0} onClick={() => onChange(index - 1)}>
        <ChevronLeft className="size-4" />
      </IconButton>
      <span className="tabular-nums">
        Seite {index + 1} / {total}
      </span>
      <IconButton title="Nächste Seite" disabled={index >= total - 1} onClick={() => onChange(index + 1)}>
        <ChevronRight className="size-4" />
      </IconButton>
    </div>
  )
}
