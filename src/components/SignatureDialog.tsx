import { Eraser, PenLine, Type, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { canvasToBlob } from '../lib/pdfjs'
import { Button, Segmented, TextInput, cx } from './ui'

export interface SignatureImage {
  url: string
  bytes: Uint8Array
  width: number
  height: number
}

const STORE_KEY = 'pdfwerk.signature'
const SCRIPT_FONTS = ['"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive', '"Bradley Hand", "Comic Sans MS", cursive', 'Georgia, "Times New Roman", serif']
const INKS = ['#0f172a', '#1d4ed8', '#7c3aed']

/** Crops transparent borders and returns PNG data. */
async function trimToPng(src: HTMLCanvasElement): Promise<SignatureImage | null> {
  const ctx = src.getContext('2d')!
  const { width, height } = src
  const data = ctx.getImageData(0, 0, width, height).data
  let x0 = width,
    y0 = height,
    x1 = -1,
    y1 = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return null
  const pad = 6
  x0 = Math.max(0, x0 - pad)
  y0 = Math.max(0, y0 - pad)
  x1 = Math.min(width - 1, x1 + pad)
  y1 = Math.min(height - 1, y1 + pad)
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d')!.drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  const blob = await canvasToBlob(out, 'image/png')
  return { url: URL.createObjectURL(blob), bytes: new Uint8Array(await blob.arrayBuffer()), width: out.width, height: out.height }
}

function DrawPad({ ink, padRef }: { ink: string; padRef: React.RefObject<HTMLCanvasElement | null> }) {
  const last = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const c = padRef.current!
    const r = c.getBoundingClientRect()
    c.width = r.width * 2
    c.height = r.height * 2
  }, [padRef])
  const pos = (e: React.PointerEvent) => {
    const r = padRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) * 2, y: (e.clientY - r.top) * 2 }
  }
  return (
    <canvas
      ref={padRef}
      className="h-48 w-full touch-none rounded-xl bg-white ring-1 ring-slate-200"
      style={{ cursor: 'crosshair', backgroundImage: 'linear-gradient(to top, transparent 30%, #e2e8f0 30%, #e2e8f0 calc(30% + 1px), transparent calc(30% + 1px))' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        last.current = pos(e)
      }}
      onPointerMove={(e) => {
        if (!last.current) return
        const p = pos(e)
        const ctx = padRef.current!.getContext('2d')!
        ctx.strokeStyle = ink
        ctx.lineWidth = 5 * (e.pressure && e.pointerType === 'pen' ? 0.5 + e.pressure : 1)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(last.current.x, last.current.y)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
        last.current = p
      }}
      onPointerUp={() => (last.current = null)}
    />
  )
}

export function SignatureDialog({ onClose, onDone }: { onClose: () => void; onDone: (s: SignatureImage) => void }) {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw')
  const [ink, setInk] = useState(INKS[0])
  const [name, setName] = useState('')
  const [font, setFont] = useState(0)
  const [remember, setRemember] = useState(true)
  const [saved, setSaved] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORE_KEY)
    } catch {
      return null
    }
  })
  const pad = useRef<HTMLCanvasElement>(null)
  const [err, setErr] = useState<string | null>(null)

  const finish = async (s: SignatureImage | null) => {
    if (!s) return setErr('Bitte zuerst unterschreiben.')
    if (remember) {
      try {
        const reader = new FileReader()
        reader.onload = () => localStorage.setItem(STORE_KEY, String(reader.result))
        reader.readAsDataURL(new Blob([s.bytes as BlobPart], { type: 'image/png' }))
      } catch {
        /* storage unavailable */
      }
    }
    onDone(s)
  }

  const fromDataUrl = async (url: string) => {
    const img = new Image()
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext('2d')!.drawImage(img, 0, 0)
    return trimToPng(c)
  }

  const submit = async () => {
    setErr(null)
    if (tab === 'draw') return finish(await trimToPng(pad.current!))
    if (tab === 'type') {
      if (!name.trim()) return setErr('Bitte deinen Namen eingeben.')
      const c = document.createElement('canvas')
      c.width = 1400
      c.height = 300
      const ctx = c.getContext('2d')!
      ctx.fillStyle = ink
      ctx.font = `italic 140px ${SCRIPT_FONTS[font]}`
      ctx.textBaseline = 'middle'
      ctx.fillText(name, 20, 150, 1360)
      return finish(await trimToPng(c))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="animate-pop w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Unterschrift erstellen</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Schließen">
            <X className="size-5" />
          </button>
        </div>

        {saved && (
          <button onClick={async () => finish(await fromDataUrl(saved))} className="mb-4 flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 ring-slate-200 transition hover:ring-brand-400">
            <img src={saved} alt="Gespeicherte Unterschrift" className="h-10 max-w-[160px] object-contain" />
            <span className="flex-1 text-sm text-slate-600">Gespeicherte Unterschrift verwenden</span>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                try {
                  localStorage.removeItem(STORE_KEY)
                } catch {
                  /* ignore */
                }
                setSaved(null)
              }}
              className="text-xs text-slate-400 hover:text-red-600"
            >
              Löschen
            </span>
          </button>
        )}

        <Segmented
          value={tab}
          onChange={setTab}
          className="mb-4"
          options={[
            { value: 'draw', label: <span className="inline-flex items-center gap-1.5"><PenLine className="size-4" /> Zeichnen</span> },
            { value: 'type', label: <span className="inline-flex items-center gap-1.5"><Type className="size-4" /> Tippen</span> },
            { value: 'upload', label: <span className="inline-flex items-center gap-1.5"><Upload className="size-4" /> Bild</span> },
          ]}
        />

        {tab !== 'upload' && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-slate-500">Farbe</span>
            {INKS.map((c) => (
              <button key={c} onClick={() => setInk(c)} className={cx('size-6 rounded-full ring-offset-2', ink === c ? 'ring-2 ring-brand-500' : '')} style={{ background: c }} title={c} />
            ))}
          </div>
        )}

        {tab === 'draw' && (
          <div className="relative">
            <DrawPad ink={ink} padRef={pad} />
            <button
              onClick={() => {
                const c = pad.current!
                c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
              }}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200 hover:text-slate-800"
            >
              <Eraser className="size-3.5" /> Leeren
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">Mit Maus, Finger oder Stift unterschreiben</p>
          </div>
        )}

        {tab === 'type' && (
          <div className="space-y-3">
            <TextInput autoFocus placeholder="Vor- und Nachname" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid gap-2">
              {SCRIPT_FONTS.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setFont(i)}
                  className={cx('truncate rounded-xl px-4 py-2 text-left text-3xl italic ring-1 transition', font === i ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300')}
                  style={{ fontFamily: f, color: ink }}
                >
                  {name || 'Max Mustermann'}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-400">
            <Upload className="mb-2 size-6" />
            Bild der Unterschrift wählen (PNG mit transparentem Hintergrund ideal)
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const url = URL.createObjectURL(f)
                finish(await fromDataUrl(url))
              }}
            />
          </label>
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> In diesem Browser merken
          </label>
          {tab !== 'upload' && (
            <Button variant="primary" onClick={submit}>
              Übernehmen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
