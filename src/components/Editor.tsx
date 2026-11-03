import { Copy, Highlighter, ImagePlus, MousePointer2, Signature, Square, SquareDashed, Trash2, Type, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { applyEdits, LINE_HEIGHT, type EditElement } from '../lib/edit'
import { baseName, pdfOut, uid } from '../lib/files'
import { cssFont, FONT_OPTIONS } from '../lib/fonts'
import type { LoadedPdf } from '../lib/loader'
import type { FontName } from '../lib/ops'
import { renderPage, type PDFDocumentProxy } from '../lib/pdfjs'
import { loadImage } from '../lib/raster'
import type { Tool } from '../tools/registry'
import { SignatureDialog, type SignatureImage } from './SignatureDialog'
import { SinglePdfTool } from './SinglePdfTool'
import { Button, ColorInput, Field, IconButton, NumberInput, Select, cx } from './ui'

type Mode = 'select' | 'text' | 'whiteout' | 'rect' | 'highlight' | 'place'
type Size = { width: number; height: number }
type Pending = { url: string; bytes: Uint8Array; kind: 'png' | 'jpg'; width: number; height: number }

const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
function measure(text: string, fontSize: number, font: FontName) {
  const f = cssFont(font)
  measureCanvas!.font = `${f.fontWeight} ${fontSize}px ${f.fontFamily}`
  const lines = text.split('\n')
  const w = Math.max(fontSize * 0.5, ...lines.map((l) => measureCanvas!.measureText(l).width))
  return { w: w + 4, h: lines.length * fontSize * LINE_HEIGHT + 4 }
}

// ------------------------------------------------------------------ page canvas

function PageCanvas({ doc, index, scale }: { doc: PDFDocumentProxy; index: number; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver((e) => setVisible(e.some((x) => x.isIntersecting)), { rootMargin: '600px' })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!visible || !scale) return
    let alive = true
    const t = setTimeout(async () => {
      const page = await doc.getPage(index + 1)
      const off = await renderPage(page, scale * Math.min(2, window.devicePixelRatio || 1))
      if (!alive || !ref.current) return
      ref.current.width = off.width
      ref.current.height = off.height
      ref.current.getContext('2d')!.drawImage(off, 0, 0)
    }, 120)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [visible, doc, index, scale])
  return <canvas ref={ref} className="absolute inset-0 h-full w-full bg-white" />
}

// ------------------------------------------------------------------ editor

export function Editor({ tool, signMode }: { tool: Tool; signMode?: boolean }) {
  const [sizes, setSizes] = useState<Size[]>([])
  const [els, setEls] = useState<EditElement[]>([])
  const elsRef = useRef(els)
  elsRef.current = els
  const hist = useRef<EditElement[][]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('select')
  const [pending, setPending] = useState<Pending | null>(null)
  const [sigOpen, setSigOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(0)
  const [textStyle, setTextStyle] = useState<{ fontSize: number; color: string; font: FontName }>({ fontSize: 14, color: '#000000', font: 'Helvetica' })
  const [rectColor, setRectColor] = useState('#2563eb')
  const wrap = useRef<HTMLDivElement | null>(null)
  const imgInput = useRef<HTMLInputElement>(null)

  const observe = useCallback((el: HTMLDivElement | null) => {
    wrap.current = el
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
  }, [])

  const maxW = Math.max(1, ...sizes.map((s) => s.width))
  const scale = width ? (Math.min(width, 980) / maxW) * zoom : 0

  // ---- history helpers
  const set = (next: EditElement[], record = true) => {
    if (record) {
      hist.current.push(elsRef.current)
      if (hist.current.length > 100) hist.current.shift()
    }
    elsRef.current = next
    setEls(next)
  }
  const patch = (id: string, p: Partial<EditElement>, record = true) =>
    set(
      elsRef.current.map((e) => {
        if (e.id !== id) return e
        const n = { ...e, ...p } as EditElement
        if (n.type === 'text') Object.assign(n, measure(n.text, n.fontSize, n.font))
        return n
      }),
      record,
    )
  const undo = () => {
    const p = hist.current.pop()
    if (p) {
      elsRef.current = p
      setEls(p)
      setSelected(null)
      setEditing(null)
    }
  }
  const remove = (id: string) => {
    set(elsRef.current.filter((e) => e.id !== id))
    setSelected(null)
    setEditing(null)
  }
  const duplicate = (id: string) => {
    const e = elsRef.current.find((x) => x.id === id)
    if (!e) return
    const c = { ...e, id: uid('el'), x: e.x + 12, y: e.y + 12 }
    set([...elsRef.current, c])
    setSelected(c.id)
  }

  // ---- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault()
        remove(selected)
      } else if (e.key === 'Escape') {
        setSelected(null)
        setEditing(null)
        setMode('select')
        setPending(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- pointer helpers
  const pt = (e: { clientX: number; clientY: number }, pageEl: HTMLElement) => {
    const r = pageEl.getBoundingClientRect()
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }
  }

  const drag = (e: React.PointerEvent, onMove: (dx: number, dy: number, ev: PointerEvent) => void, onEnd?: (moved: boolean) => void) => {
    e.preventDefault()
    e.stopPropagation()
    const sx = e.clientX
    const sy = e.clientY
    let moved = false
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale
      const dy = (ev.clientY - sy) / scale
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true
      onMove(dx, dy, ev)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onEnd?.(moved)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onPageDown = (e: React.PointerEvent<HTMLDivElement>, page: number) => {
    if (e.button !== 0) return
    const pageEl = e.currentTarget
    const p = pt(e, pageEl)
    const size = sizes[page]
    if (mode === 'select') {
      setSelected(null)
      setEditing(null)
      return
    }
    if (mode === 'text') {
      e.preventDefault()
      const el: EditElement = { id: uid('el'), page, type: 'text', text: '', ...textStyle, x: p.x, y: p.y - textStyle.fontSize * 0.7, ...measure('', textStyle.fontSize, textStyle.font) }
      set([...elsRef.current, el])
      setSelected(el.id)
      setEditing(el.id)
      setMode('select')
      return
    }
    if (mode === 'place' && pending) {
      e.preventDefault()
      const w = Math.min(signMode || pending.width > 200 ? 180 : pending.width, size.width * 0.6)
      const h = (w * pending.height) / pending.width
      const el: EditElement = { id: uid('el'), page, type: 'image', url: pending.url, bytes: pending.bytes, kind: pending.kind, x: Math.max(0, p.x - w / 2), y: Math.max(0, p.y - h / 2), w, h }
      set([...elsRef.current, el])
      setSelected(el.id)
      setPending(null)
      setMode('select')
      return
    }
    // rectangles
    const style =
      mode === 'whiteout' ? { color: '#ffffff', opacity: 1 } : mode === 'highlight' ? { color: '#facc15', opacity: 0.4 } : { color: rectColor, opacity: 1 }
    const id = uid('el')
    const before = elsRef.current
    const el: EditElement = { id, page, type: 'rect', x: p.x, y: p.y, w: 0, h: 0, ...style }
    set([...before, el], false)
    setSelected(id)
    drag(
      e,
      (dx, dy) => {
        const x = Math.max(0, Math.min(p.x, p.x + dx))
        const y = Math.max(0, Math.min(p.y, p.y + dy))
        const x2 = Math.min(size.width, Math.max(p.x, p.x + dx))
        const y2 = Math.min(size.height, Math.max(p.y, p.y + dy))
        patch(id, { x, y, w: x2 - x, h: y2 - y }, false)
      },
      (moved) => {
        hist.current.push(before)
        if (!moved) patch(id, { x: p.x - 50, y: p.y - (mode === 'highlight' ? 8 : 20), w: 100, h: mode === 'highlight' ? 16 : 40 }, false)
        setMode('select')
      },
    )
  }

  const onElDown = (e: React.PointerEvent, el: EditElement) => {
    if (e.button !== 0 || mode !== 'select') return
    if (editing === el.id) return
    setSelected(el.id)
    if (editing) setEditing(null)
    const before = elsRef.current
    const size = sizes[el.page]
    drag(
      e,
      (dx, dy) =>
        patch(
          el.id,
          {
            x: Math.max(-el.w / 2, Math.min(size.width - el.w / 2, el.x + dx)),
            y: Math.max(-el.h / 2, Math.min(size.height - el.h / 2, el.y + dy)),
          },
          false,
        ),
      (moved) => moved && hist.current.push(before),
    )
  }

  const onResizeDown = (e: React.PointerEvent, el: EditElement) => {
    const before = elsRef.current
    const ratio = el.w / el.h
    drag(
      e,
      (dx, dy, ev) => {
        let w = Math.max(8, el.w + dx)
        let h = Math.max(8, el.h + dy)
        if (el.type === 'image' && !ev.shiftKey) h = w / ratio
        if (el.type === 'image' && ev.shiftKey) w = Math.max(8, el.w + dx)
        patch(el.id, { w, h }, false)
      },
      (moved) => moved && hist.current.push(before),
    )
  }

  const startPlace = (p: Pending) => {
    setPending(p)
    setMode('place')
    setSelected(null)
  }

  const sel = els.find((e) => e.id === selected) ?? null

  // ---- UI pieces
  const ModeBtn = ({ m, icon, label, onClick }: { m?: Mode; icon: ReactNode; label: string; onClick?: () => void }) => (
    <button
      onClick={onClick ?? (() => (setMode(m!), setPending(null), setSelected(null), setEditing(null)))}
      title={label}
      className={cx(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition',
        m && mode === m ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )

  const hint =
    mode === 'text'
      ? 'Klicke auf die Seite, um Text einzufügen.'
      : mode === 'whiteout'
        ? 'Ziehe einen Bereich auf, der weiß abgedeckt werden soll.'
        : mode === 'highlight'
          ? 'Ziehe über den Text, den du markieren möchtest.'
          : mode === 'rect'
            ? 'Ziehe ein Rechteck auf.'
            : mode === 'place'
              ? 'Klicke auf die Stelle, an der das Element erscheinen soll.'
              : null

  const toolbar = () => (
    <>
      <input
        ref={imgInput}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) startPlace(await loadImage(f))
        }}
      />
      <div className="flex flex-wrap items-center gap-0.5">
        <ModeBtn m="select" icon={<MousePointer2 className="size-4" />} label="Auswählen" />
        <ModeBtn m="text" icon={<Type className="size-4" />} label="Text" />
        <ModeBtn m="whiteout" icon={<SquareDashed className="size-4" />} label="Weißfläche" />
        <ModeBtn m="highlight" icon={<Highlighter className="size-4" />} label="Markieren" />
        <ModeBtn m="rect" icon={<Square className="size-4" />} label="Rechteck" />
        <ModeBtn icon={<ImagePlus className="size-4" />} label="Bild" onClick={() => imgInput.current?.click()} />
        <button
          onClick={() => setSigOpen(true)}
          className={cx('inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition', signMode ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100' : 'text-slate-600 hover:bg-slate-100')}
          title="Unterschrift"
        >
          <Signature className="size-4" />
          <span className="hidden sm:inline">Unterschrift</span>
        </button>
      </div>
      <div className="ml-auto flex items-center gap-0.5">
        <IconButton title="Rückgängig (Strg+Z)" onClick={undo} disabled={!hist.current.length}>
          <Undo2 className="size-4" />
        </IconButton>
        <IconButton title="Verkleinern" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(1)))}>
          <ZoomOut className="size-4" />
        </IconButton>
        <span className="hidden w-11 text-center text-xs tabular-nums text-slate-500 2xl:block">{Math.round(zoom * 100)} %</span>
        <IconButton title="Vergrößern" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}>
          <ZoomIn className="size-4" />
        </IconButton>
      </div>
      {hint && <div className="w-full rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">{hint}</div>}
    </>
  )

  const renderEl = (el: EditElement) => {
    const isSel = selected === el.id
    const style: React.CSSProperties = { left: el.x * scale, top: el.y * scale, width: el.w * scale, height: el.h * scale }
    let body: ReactNode
    if (el.type === 'text') {
      const st: React.CSSProperties = {
        ...cssFont(el.font),
        fontSize: el.fontSize * scale,
        lineHeight: LINE_HEIGHT,
        color: el.color,
        padding: 2 * scale,
        whiteSpace: 'pre',
      }
      body =
        editing === el.id ? (
          <textarea
            autoFocus
            value={el.text}
            spellCheck={false}
            onPointerDown={(e) => e.stopPropagation()}
            onFocus={() => hist.current.push(elsRef.current)}
            onChange={(e) => patch(el.id, { text: e.target.value }, false)}
            onBlur={() => {
              setEditing(null)
              if (!elsRef.current.find((x) => x.id === el.id && x.type === 'text' && x.text.trim())) set(elsRef.current.filter((x) => x.id !== el.id), false)
            }}
            className="absolute inset-0 resize-none overflow-hidden border-0 bg-white/60 p-0 outline-none"
            style={{ ...st, width: Math.max(el.w * scale, 40), height: el.h * scale }}
          />
        ) : (
          <div style={st} className="absolute inset-0 overflow-visible">
            {el.text}
          </div>
        )
    } else if (el.type === 'rect') {
      body = <div className="absolute inset-0" style={{ background: el.color, opacity: el.opacity, boxShadow: el.color === '#ffffff' ? 'inset 0 0 0 1px #e2e8f0' : undefined }} />
    } else {
      body = <img src={el.url} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
    }
    return (
      <div
        key={el.id}
        style={style}
        className={cx('absolute', mode === 'select' && 'cursor-move', isSel ? 'outline-2 outline-offset-2 outline-brand-500 outline-dashed' : mode === 'select' && 'hover:outline-1 hover:outline-brand-300 hover:outline-dashed')}
        onPointerDown={(e) => onElDown(e, el)}
        onDoubleClick={() => el.type === 'text' && setEditing(el.id)}
      >
        {body}
        {isSel && editing !== el.id && (
          <>
            <div className="absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 rounded-lg bg-slate-900 p-0.5 shadow-lg" onPointerDown={(e) => e.stopPropagation()}>
              {el.type === 'text' && (
                <button className="rounded-md px-2 py-1 text-xs font-medium text-white hover:bg-white/15" onClick={() => setEditing(el.id)}>
                  Bearbeiten
                </button>
              )}
              <button className="rounded-md p-1.5 text-white hover:bg-white/15" title="Duplizieren" onClick={() => duplicate(el.id)}>
                <Copy className="size-3.5" />
              </button>
              <button className="rounded-md p-1.5 text-red-300 hover:bg-white/15" title="Löschen" onClick={() => remove(el.id)}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {el.type !== 'text' && (
              <div
                className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-full border-2 border-white bg-brand-600 shadow"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => onResizeDown(e, el)}
              />
            )}
          </>
        )}
      </div>
    )
  }

  const main = (pdf: LoadedPdf) => (
    <div ref={observe} className="-m-3 overflow-auto bg-slate-100 p-3 sm:-m-5 sm:rounded-b-2xl sm:p-6">
      <div className="mx-auto flex w-fit flex-col items-center gap-6">
        {sizes.map((s, i) => (
          <div key={i}>
            <div
              className={cx('relative shadow-[0_2px_12px_rgba(15,23,42,.15)]', mode === 'select' ? 'cursor-default' : mode === 'text' ? 'cursor-text' : 'cursor-crosshair', mode !== 'select' && 'touch-none')}
              style={{ width: s.width * scale, height: s.height * scale }}
              onPointerDown={(e) => onPageDown(e, i)}
            >
              <PageCanvas doc={pdf.doc} index={i} scale={scale} />
              {els.filter((e) => e.page === i).map(renderEl)}
            </div>
            <div className="mt-2 text-center text-xs text-slate-400">
              Seite {i + 1} / {sizes.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const side = () => (
    <>
      {sel?.type === 'text' ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Text</h3>
          <Field label="Inhalt">
            <textarea
              className="h-20 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
              value={sel.text}
              onChange={(e) => patch(sel.id, { text: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Schrift">
              <Select value={sel.font} onChange={(font) => (patch(sel.id, { font }), setTextStyle((t) => ({ ...t, font })))} options={FONT_OPTIONS} />
            </Field>
            <Field label="Größe">
              <NumberInput value={sel.fontSize} min={4} max={200} suffix="pt" onChange={(v) => Number.isFinite(v) && v >= 4 && (patch(sel.id, { fontSize: v }), setTextStyle((t) => ({ ...t, fontSize: v })))} />
            </Field>
          </div>
          <Field label="Farbe">
            <ColorInput value={sel.color} onChange={(color) => (patch(sel.id, { color }), setTextStyle((t) => ({ ...t, color })))} />
          </Field>
        </div>
      ) : sel?.type === 'rect' ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Fläche</h3>
          <Field label="Farbe">
            <ColorInput value={sel.color} onChange={(color) => (patch(sel.id, { color }), setRectColor(color))} />
          </Field>
          <Field label={`Deckkraft: ${Math.round(sel.opacity * 100)} %`}>
            <input type="range" min={5} max={100} value={Math.round(sel.opacity * 100)} onChange={(e) => patch(sel.id, { opacity: +e.target.value / 100 }, false)} className="w-full" />
          </Field>
        </div>
      ) : sel?.type === 'image' ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Bild</h3>
          <p className="text-sm text-slate-500">Ziehen zum Verschieben, Punkt unten rechts zum Skalieren (Umschalt = frei verzerren).</p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-slate-500">
          <p>
            {signMode ? (
              <>
                Klicke auf <b className="text-slate-700">Unterschrift</b>, erstelle deine Signatur und platziere sie per Klick auf der Seite.
              </>
            ) : (
              <>Wähle oben ein Werkzeug und klicke bzw. ziehe auf der Seite. Elemente lassen sich danach verschieben, skalieren und löschen.</>
            )}
          </p>
          <p className="text-xs text-slate-400">Entf = löschen · Strg+Z = rückgängig · Doppelklick = Text bearbeiten</p>
        </div>
      )}
      {sel && (
        <div className="flex gap-2">
          <Button size="sm" icon={<Copy className="size-4" />} onClick={() => duplicate(sel.id)}>
            Duplizieren
          </Button>
          <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => remove(sel.id)}>
            Löschen
          </Button>
        </div>
      )}
      {els.length > 0 && <p className="text-xs text-slate-400">{els.length} Änderung(en) auf {new Set(els.map((e) => e.page)).size} Seite(n)</p>}
      {sigOpen && (
        <SignatureDialog
          onClose={() => setSigOpen(false)}
          onDone={(s: SignatureImage) => {
            setSigOpen(false)
            startPlace({ ...s, kind: 'png' })
          }}
        />
      )}
    </>
  )

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel={signMode ? 'Unterschreiben & speichern' : 'Änderungen übernehmen'}
      onLoaded={async (p) => {
        set([], false)
        hist.current = []
        setSelected(null)
        const s: Size[] = []
        for (let i = 1; i <= p.numPages; i++) {
          const vp = (await p.doc.getPage(i)).getViewport({ scale: 1 })
          s.push({ width: vp.width, height: vp.height })
        }
        setSizes(s)
        if (signMode) setSigOpen(true)
      }}
      validate={() => (els.length ? null : signMode ? 'Füge zuerst eine Unterschrift ein.' : 'Füge zuerst Inhalte hinzu.')}
      toolbar={toolbar}
      main={main}
      side={side}
      run={async (pdf) => {
        const valid = els.filter((e) => (e.type !== 'text' || e.text.trim()) && e.w > 0 && e.h > 0)
        const bytes = await applyEdits(pdf.bytes, valid)
        return [pdfOut(`${baseName(pdf.name)}-${signMode ? 'unterschrieben' : 'bearbeitet'}.pdf`, bytes)]
      }}
    />
  )
}
