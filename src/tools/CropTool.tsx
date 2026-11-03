import { useRef, useState } from 'react'
import { PagePager, PagePreview } from '../components/PagePreview'
import { PageScope, resolveScope, type Scope } from '../components/PageScope'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Button, Field, NumberInput } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { crop } from '../lib/ops'
import { toolBySlug } from './registry'

const tool = toolBySlug('crop')!
const PT = 72 / 25.4
type M = { top: number; right: number; bottom: number; left: number }

function CropOverlay({ scale, size, m, onChange }: { scale: number; size: { width: number; height: number }; m: M; onChange: (m: M) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const toPt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(size.width, (e.clientX - r.left) / scale)),
      y: Math.max(0, Math.min(size.height, (e.clientY - r.top) / scale)),
    }
  }
  const update = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const r = (v: number) => Math.round((v / PT) * 10) / 10
    onChange({
      left: r(Math.min(a.x, b.x)),
      top: r(Math.min(a.y, b.y)),
      right: r(size.width - Math.max(a.x, b.x)),
      bottom: r(size.height - Math.max(a.y, b.y)),
    })
  }
  const box = { left: m.left * PT * scale, top: m.top * PT * scale, right: m.right * PT * scale, bottom: m.bottom * PT * scale }
  return (
    <div
      ref={ref}
      className="absolute inset-0 cursor-crosshair touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = toPt(e)
      }}
      onPointerMove={(e) => {
        if (!start.current) return
        const p = toPt(e)
        if (Math.abs(p.x - start.current.x) > 4 && Math.abs(p.y - start.current.y) > 4) update(start.current, p)
      }}
      onPointerUp={() => (start.current = null)}
    >
      <div
        className="pointer-events-none absolute border-2 border-brand-600"
        style={{ ...box, boxShadow: '0 0 0 9999px rgba(15,23,42,.45)' }}
      >
        <div className="absolute inset-0 border border-dashed border-white/70" />
      </div>
    </div>
  )
}

export default function CropTool() {
  const [m, setM] = useState<M>({ top: 10, right: 10, bottom: 10, left: 10 })
  const [scope, setScope] = useState<Scope>({ mode: 'all', text: '' })
  const [page, setPage] = useState(0)
  const set = (k: keyof M) => (v: number) => setM((x) => ({ ...x, [k]: v }))

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="PDF zuschneiden"
      onLoaded={() => setPage(0)}
      validate={() => (Object.values(m).every((v) => !v) ? 'Ziehe einen Bereich auf der Seite auf oder gib Ränder ein.' : null)}
      toolbar={(pdf) => (
        <>
          <span className="text-sm text-slate-500">Bereich mit der Maus / dem Finger aufziehen</span>
          <span className="ml-auto">
            <PagePager index={page} total={pdf.numPages} onChange={setPage} />
          </span>
        </>
      )}
      main={(pdf) => <PagePreview doc={pdf.doc} index={page} overlay={(s, size) => <CropOverlay scale={s} size={size} m={m} onChange={setM} />} />}
      side={(pdf) => (
        <>
          <Field label="Ränder entfernen">
            <div className="grid grid-cols-2 gap-3">
              {(['top', 'bottom', 'left', 'right'] as const).map((k) => (
                <div key={k}>
                  <span className="mb-1 block text-xs text-slate-500">{{ top: 'Oben', bottom: 'Unten', left: 'Links', right: 'Rechts' }[k]}</span>
                  <NumberInput value={m[k]} onChange={set(k)} min={0} step={0.5} suffix="mm" />
                </div>
              ))}
            </div>
          </Field>
          <Button size="sm" variant="ghost" onClick={() => setM({ top: 0, right: 0, bottom: 0, left: 0 })}>
            Ränder zurücksetzen
          </Button>
          <PageScope value={scope} onChange={setScope} total={pdf.numPages} />
        </>
      )}
      run={async (pdf) => {
        const bytes = await crop(pdf.bytes, { top: m.top * PT, right: m.right * PT, bottom: m.bottom * PT, left: m.left * PT }, resolveScope(scope, pdf.numPages))
        return [pdfOut(`${baseName(pdf.name)}-zugeschnitten.pdf`, bytes)]
      }}
    />
  )
}
