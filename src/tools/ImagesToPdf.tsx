import { RotateCw, X } from 'lucide-react'
import { useState } from 'react'
import { AddFilesButton, Dropzone } from '../components/Dropzone'
import { ResultView } from '../components/ResultView'
import { SortableGrid, noDrag } from '../components/SortableGrid'
import { UploadStage, Workspace } from '../components/ToolLayout'
import { Alert, Button, Field, NumberInput, Segmented, Select, TextInput } from '../components/ui'
import { pdfOut, uid, type OutFile } from '../lib/files'
import { imagesToPdf, PAGE_SIZES, type ImageItem } from '../lib/ops'
import { canvasToBlob } from '../lib/pdfjs'
import { loadImage } from '../lib/raster'
import { toolBySlug } from './registry'

const tool = toolBySlug('images-to-pdf')!

type Img = ImageItem & { id: string; name: string; url: string; rotate: number }

async function rotated(im: Img): Promise<ImageItem> {
  const r = ((im.rotate % 360) + 360) % 360
  if (!r) return im
  const el = new Image()
  el.src = im.url
  await el.decode()
  const c = document.createElement('canvas')
  const swap = r % 180 !== 0
  c.width = swap ? im.height : im.width
  c.height = swap ? im.width : im.height
  const ctx = c.getContext('2d')!
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate((r * Math.PI) / 180)
  ctx.drawImage(el, -im.width / 2, -im.height / 2)
  const kind = im.kind
  const blob = await canvasToBlob(c, kind === 'png' ? 'image/png' : 'image/jpeg', 0.92)
  return { bytes: new Uint8Array(await blob.arrayBuffer()), kind, width: c.width, height: c.height }
}

export default function ImagesToPdf() {
  const [imgs, setImgs] = useState<Img[]>([])
  const [size, setSize] = useState<'fit' | 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal'>('A4')
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto')
  const [margin, setMargin] = useState(10)
  const [name, setName] = useState('bilder')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<OutFile[] | null>(null)

  const add = async (files: File[]) => {
    setErr(null)
    const out: Img[] = []
    for (const f of files) {
      try {
        const im = await loadImage(f)
        out.push({ ...im, id: uid('img'), name: f.name, rotate: 0 })
      } catch {
        setErr(`„${f.name}“ konnte nicht gelesen werden.`)
      }
    }
    setImgs((x) => [...x, ...out])
  }

  if (result) return <ResultView tool={tool} files={result} onBack={() => setResult(null)} onReset={() => (setResult(null), setImgs([]))} />

  if (!imgs.length)
    return (
      <UploadStage tool={tool}>
        <Dropzone accept="image" multiple onFiles={add} />
        {err && (
          <div className="mt-4">
            <Alert>{err}</Alert>
          </div>
        )}
      </UploadStage>
    )

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      const items = await Promise.all(imgs.map(rotated))
      const bytes = await imagesToPdf(items, { size, margin: (margin * 72) / 25.4, orientation })
      setResult([pdfOut(`${name.replace(/\.pdf$/i, '') || 'bilder'}.pdf`, bytes)])
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Workspace
      tool={tool}
      onReset={() => setImgs([])}
      toolbar={
        <>
          <AddFilesButton accept="image" onFiles={add} label="Bilder hinzufügen" />
          <span className="ml-auto text-sm text-slate-500">{imgs.length} Bilder</span>
        </>
      }
      main={
        <SortableGrid
          items={imgs}
          onChange={setImgs}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
          render={(im, i) => (
            <div className="group relative">
              <div className="checker flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl p-3 ring-1 ring-slate-200">
                <img src={im.url} alt={im.name} draggable={false} className="max-h-full max-w-full object-contain shadow transition-transform" style={{ transform: `rotate(${im.rotate}deg)` }} />
              </div>
              <div className="absolute right-2 top-2 flex gap-0.5 rounded-lg bg-white/95 p-0.5 shadow ring-1 ring-slate-200 sm:opacity-0 sm:group-hover:opacity-100">
                <button {...noDrag} onClick={() => setImgs((l) => l.map((x) => (x.id === im.id ? { ...x, rotate: x.rotate + 90 } : x)))} className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" title="Drehen">
                  <RotateCw className="size-4" />
                </button>
                <button {...noDrag} onClick={() => setImgs((l) => l.filter((x) => x.id !== im.id))} className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-red-600" title="Entfernen">
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-1.5 truncate text-center text-xs text-slate-500" title={im.name}>
                {i + 1}. {im.name}
              </div>
            </div>
          )}
        />
      }
      side={
        <>
          <Field label="Seitengröße">
            <Select
              value={size}
              onChange={setSize}
              options={[{ value: 'fit', label: 'An Bild anpassen' }, ...Object.keys(PAGE_SIZES).map((k) => ({ value: k as 'A4', label: k }))]}
            />
          </Field>
          {size !== 'fit' && (
            <Field label="Ausrichtung">
              <Segmented
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'portrait', label: 'Hoch' },
                  { value: 'landscape', label: 'Quer' },
                ]}
              />
            </Field>
          )}
          <Field label="Rand">
            <NumberInput value={margin} onChange={setMargin} min={0} max={50} suffix="mm" />
          </Field>
          <Field label="Dateiname">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {err && <Alert>{err}</Alert>}
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" loading={busy} onClick={run}>
          PDF erstellen
        </Button>
      }
    />
  )
}
