import { ArrowDownUp, Copy, FilePlus, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AddFilesButton, Dropzone } from '../components/Dropzone'
import { ResultView } from '../components/ResultView'
import { SortableGrid, noDrag } from '../components/SortableGrid'
import { Thumb } from '../components/Thumb'
import { UploadStage, Workspace } from '../components/ToolLayout'
import { Alert, Button, Field, IconButton, TextInput } from '../components/ui'
import { baseName, pdfOut, uid, type OutFile } from '../lib/files'
import type { LoadedPdf } from '../lib/loader'
import { assemble, type PageRef } from '../lib/ops'
import { useMultiPdf } from '../lib/useMultiPdf'
import { toolBySlug } from './registry'

const tool = toolBySlug('organize')!

type Item = { id: string; pdfId: string; index: number; rotate: number } | { id: string; pdfId: null; index: -1; rotate: number; w: number; h: number }

const pagesOf = (p: LoadedPdf): Item[] => Array.from({ length: p.numPages }, (_, index) => ({ id: uid('pg'), pdfId: p.id, index, rotate: 0 }))

export default function Organize() {
  const [items, setItems] = useState<Item[]>([])
  const m = useMultiPdf((added) => setItems((it) => [...it, ...added.flatMap(pagesOf)]))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<OutFile[] | null>(null)
  const byId = useMemo(() => new Map(m.pdfs.map((p) => [p.id, p])), [m.pdfs])

  const reset = () => {
    m.reset()
    setItems([])
    setResult(null)
  }
  if (result) return <ResultView tool={tool} files={result} onBack={() => setResult(null)} onReset={reset} />

  if (!m.pdfs.length)
    return (
      <UploadStage tool={tool} note="Mehrere PDFs möglich – alle Seiten landen in einer gemeinsamen Ansicht.">
        <Dropzone multiple onFiles={m.add} />
        {m.error && (
          <div className="mt-4">
            <Alert>{m.error}</Alert>
          </div>
        )}
      </UploadStage>
    )

  const update = (id: string, fn: (i: Item) => Item | Item[] | null) =>
    setItems((list) =>
      list.flatMap((x) => {
        if (x.id !== id) return [x]
        const r = fn(x)
        return r === null ? [] : Array.isArray(r) ? r : [r]
      }),
    )

  /** blank pages are A4, or the size of the blank page they follow */
  const blankAfter = (x: Item): Item[] => {
    const [w, h] = x.pdfId === null ? [x.w, x.h] : [595.28, 841.89]
    return [x, { id: uid('pg'), pdfId: null, index: -1, rotate: 0, w, h }]
  }

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      const sources = m.pdfs.map((p) => p.bytes)
      const srcIdx = new Map(m.pdfs.map((p, i) => [p.id, i]))
      const refs: PageRef[] = items.map((x) =>
        x.pdfId === null
          ? { kind: 'blank', width: x.w, height: x.h }
          : { kind: 'page', src: srcIdx.get(x.pdfId)!, index: x.index, rotate: ((x.rotate % 360) + 360) % 360 },
      )
      const bytes = await assemble(sources, refs)
      setResult([pdfOut(`${(name || baseName(m.pdfs[0].name) + '-organisiert').replace(/\.pdf$/i, '')}.pdf`, bytes)])
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Workspace
      tool={tool}
      onReset={reset}
      toolbar={
        <>
          <AddFilesButton onFiles={m.add} label="PDF hinzufügen" />
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => setItems((l) => l.map((x) => ({ ...x, rotate: x.rotate - 90 })))}>
            <span className="hidden sm:inline">Alle links</span>
          </Button>
          <Button size="sm" variant="ghost" icon={<RotateCw className="size-4" />} onClick={() => setItems((l) => l.map((x) => ({ ...x, rotate: x.rotate + 90 })))}>
            <span className="hidden sm:inline">Alle rechts</span>
          </Button>
          <Button size="sm" variant="ghost" icon={<ArrowDownUp className="size-4" />} onClick={() => setItems((l) => [...l].reverse())}>
            <span className="hidden sm:inline">Umkehren</span>
          </Button>
          <span className="ml-auto text-sm text-slate-500">{items.length} Seiten</span>
        </>
      }
      main={
        <>
          <SortableGrid
            items={items}
            onChange={setItems}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
            render={(x, i, overlay) => {
              const pdf = x.pdfId ? byId.get(x.pdfId) : null
              return (
                <div className="group relative">
                  <div className="rounded-xl bg-slate-100/70 p-2 ring-1 ring-transparent transition group-hover:ring-slate-300 sm:p-3">
                    {pdf ? (
                      <Thumb doc={pdf.doc} index={x.index} rotation={x.rotate} />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center">
                        <div
                          className="flex h-full items-center justify-center rounded-sm bg-white text-xs text-slate-300 shadow-[0_1px_3px_rgba(15,23,42,.18)] transition-transform"
                          style={{ aspectRatio: x.pdfId === null ? `${x.w} / ${x.h}` : undefined, transform: `rotate(${x.rotate}deg)${x.rotate % 180 ? ' scale(0.75)' : ''}` }}
                        >
                          leer
                        </div>
                      </div>
                    )}
                    {!overlay && (
                      <div className="absolute inset-x-0 bottom-8 flex justify-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <div className="flex gap-0.5 rounded-lg bg-white/95 p-0.5 shadow-md ring-1 ring-slate-200">
                          <IconButton {...noDrag} title="Links drehen" onClick={() => update(x.id, (v) => ({ ...v, rotate: v.rotate - 90 }))}>
                            <RotateCcw className="size-4" />
                          </IconButton>
                          <IconButton {...noDrag} title="Rechts drehen" onClick={() => update(x.id, (v) => ({ ...v, rotate: v.rotate + 90 }))}>
                            <RotateCw className="size-4" />
                          </IconButton>
                          <IconButton {...noDrag} title="Duplizieren" onClick={() => update(x.id, (v) => [v, { ...v, id: uid('pg') }])}>
                            <Copy className="size-4" />
                          </IconButton>
                          <IconButton {...noDrag} title="Leere Seite danach einfügen" onClick={() => update(x.id, blankAfter)}>
                            <FilePlus className="size-4" />
                          </IconButton>
                          <IconButton {...noDrag} title="Löschen" className="hover:!text-red-600" onClick={() => update(x.id, () => null)}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 truncate text-center text-xs font-medium text-slate-500">
                    {i + 1}
                    {m.pdfs.length > 1 && pdf && <span className="font-normal text-slate-400"> · {pdf.name}</span>}
                  </div>
                </div>
              )
            }}
          />
          {!items.length && <p className="py-10 text-center text-sm text-slate-500">Alle Seiten entfernt – füge eine PDF hinzu.</p>}
        </>
      }
      side={
        <>
          <Field label="Dateiname">
            <TextInput value={name} placeholder={baseName(m.pdfs[0].name) + '-organisiert'} onChange={(e) => setName(e.target.value)} />
          </Field>
          <p className="text-sm text-slate-500">Seiten per Drag & Drop verschieben (am Handy: kurz gedrückt halten). Fahre über eine Seite für weitere Aktionen.</p>
          {(err || m.error) && <Alert>{err || m.error}</Alert>}
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" loading={busy} disabled={!items.length} onClick={run}>
          PDF speichern
        </Button>
      }
    />
  )
}
