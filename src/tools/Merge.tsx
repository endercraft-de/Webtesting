import { ArrowDownAZ, X } from 'lucide-react'
import { useState } from 'react'
import { AddFilesButton, Dropzone } from '../components/Dropzone'
import { ResultView } from '../components/ResultView'
import { SortableGrid, noDrag } from '../components/SortableGrid'
import { Thumb } from '../components/Thumb'
import { UploadStage, Workspace } from '../components/ToolLayout'
import { Alert, Button, Field, TextInput, Toggle } from '../components/ui'
import { formatBytes, pdfOut, type OutFile } from '../lib/files'
import { merge } from '../lib/ops'
import { useMultiPdf } from '../lib/useMultiPdf'
import { toolBySlug } from './registry'

const tool = toolBySlug('merge')!

export default function Merge() {
  const m = useMultiPdf()
  const [padOdd, setPadOdd] = useState(false)
  const [name, setName] = useState('zusammengefuegt')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<OutFile[] | null>(null)

  if (result) return <ResultView tool={tool} files={result} onBack={() => setResult(null)} onReset={() => (setResult(null), m.reset())} />

  if (!m.pdfs.length)
    return (
      <UploadStage tool={tool} note="Du kannst auch später weitere Dateien hinzufügen und die Reihenfolge per Drag & Drop ändern.">
        <Dropzone multiple onFiles={m.add} />
        {m.loading && <p className="mt-4 text-center text-sm text-slate-500">Dateien werden geöffnet …</p>}
        {m.error && (
          <div className="mt-4">
            <Alert>{m.error}</Alert>
          </div>
        )}
      </UploadStage>
    )

  const totalPages = m.pdfs.reduce((s, p) => s + p.numPages, 0)
  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      const bytes = await merge(m.pdfs.map((p) => p.bytes), { padOdd })
      setResult([pdfOut(`${(name || 'zusammengefuegt').replace(/\.pdf$/i, '')}.pdf`, bytes)])
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Workspace
      tool={tool}
      onReset={m.reset}
      toolbar={
        <>
          <AddFilesButton onFiles={m.add} />
          <Button size="sm" variant="ghost" icon={<ArrowDownAZ className="size-4" />} onClick={() => m.setPdfs((p) => [...p].sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true })))}>
            Nach Name sortieren
          </Button>
          <span className="ml-auto text-sm text-slate-500">
            {m.pdfs.length} Dateien · {totalPages} Seiten
          </span>
        </>
      }
      main={
        <>
          <SortableGrid
            items={m.pdfs}
            onChange={m.setPdfs}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
            render={(p, i) => (
              <div className="group relative rounded-2xl bg-slate-100/70 p-3 ring-1 ring-transparent transition hover:ring-slate-300">
                <span className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
                <button
                  {...noDrag}
                  onClick={() => m.remove(p.id)}
                  className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 transition hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Entfernen"
                >
                  <X className="size-4" />
                </button>
                <Thumb doc={p.doc} index={0} />
                <div className="mt-2 truncate text-center text-xs font-medium text-slate-700" title={p.name}>
                  {p.name}
                </div>
                <div className="text-center text-[11px] text-slate-400">
                  {p.numPages} S. · {formatBytes(p.size)}
                </div>
              </div>
            )}
          />
          {m.loading && <p className="mt-4 text-sm text-slate-500">Dateien werden geöffnet …</p>}
          <p className="mt-4 text-center text-xs text-slate-400">Ziehe die Dateien, um die Reihenfolge zu ändern.</p>
        </>
      }
      side={
        <>
          <Field label="Dateiname">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Toggle checked={padOdd} onChange={setPadOdd} label="Leerseite bei ungerader Seitenzahl" hint="Damit jedes Dokument beim Duplexdruck auf einer neuen Blattvorderseite beginnt." />
          {m.error && <Alert>{m.error}</Alert>}
          {err && <Alert>{err}</Alert>}
          {m.pdfs.length < 2 && <Alert tone="warn">Füge mindestens zwei PDFs hinzu.</Alert>}
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" loading={busy} disabled={m.pdfs.length < 2} onClick={run}>
          {m.pdfs.length} PDFs zusammenfügen
        </Button>
      }
    />
  )
}
