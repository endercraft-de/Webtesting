import { useEffect, useRef, useState } from 'react'
import { renderThumbnail, type PDFDocumentProxy } from '../lib/pdfjs'
import { cx } from './ui'

const cache = new WeakMap<PDFDocumentProxy, Map<number, Promise<string>>>()
let active = 0
const queue: (() => void)[] = []
const MAX = 3

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--
          queue.shift()?.()
        })
    }
    if (active < MAX) run()
    else queue.push(run)
  })
}

export function getThumb(doc: PDFDocumentProxy, index: number): Promise<string> {
  let m = cache.get(doc)
  if (!m) cache.set(doc, (m = new Map()))
  let p = m.get(index)
  if (!p) {
    p = schedule(() => renderThumbnail(doc, index))
    m.set(index, p)
  }
  return p
}

/** Lazily rendered page thumbnail. */
export function Thumb({ doc, index, rotation = 0, className }: { doc: PDFDocumentProxy | null; index: number; rotation?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible(true), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !doc) return
    let alive = true
    getThumb(doc, index).then((u) => alive && setUrl(u), () => {})
    return () => {
      alive = false
    }
  }, [visible, doc, index])

  const sideways = rotation % 180 !== 0
  return (
    <div ref={ref} className={cx('relative flex aspect-[3/4] items-center justify-center', className)}>
      {url ? (
        <img
          src={url}
          alt={`Seite ${index + 1}`}
          draggable={false}
          className="max-h-full max-w-full rounded-sm bg-white shadow-[0_1px_3px_rgba(15,23,42,.18)] transition-transform duration-200"
          style={{ transform: `rotate(${rotation}deg)${sideways ? ' scale(0.75)' : ''}` }}
        />
      ) : (
        <div className="h-full w-[78%] animate-pulse rounded-sm bg-slate-200/70" />
      )}
    </div>
  )
}
