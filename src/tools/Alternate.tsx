import { ArrowLeftRight, X } from 'lucide-react'
import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { ResultView } from '../components/ResultView'
import { Thumb } from '../components/Thumb'
import { UploadStage, Workspace } from '../components/ToolLayout'
import { Alert, Button, Toggle } from '../components/ui'
import { baseName, formatBytes, pdfOut, type OutFile } from '../lib/files'
import type { LoadedPdf } from '../lib/loader'
import { assemble, type PageRef } from '../lib/ops'
import { useMultiPdf } from '../lib/useMultiPdf'
import { toolBySlug } from './registry'

const tool = toolBySlug('alternate')!

function Slot({ label, pdf, onRemove, onFiles }: { label: string; pdf?: LoadedPdf; onRemove: () => void; onFiles: (f: File[]) => void }) {
  return (
    <div className="flex-1">
      <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
      {pdf ? (
        <div className="relative rounded-2xl bg-slate-100/70 p-4">
          <button onClick={onRemove} title="Entfernen" className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 hover:text-red-600">
            <X className="size-4" />
          </button>
          <Thumb doc={pdf.doc} index={0} className="mx-auto max-w-[180px]" />
          <div className="mt-2 truncate text-center text-sm font-medium text-slate-700">{pdf.name}</div>
          <div className="text-center text-xs text-slate-400">
            {pdf.numPages} Seiten · {formatBytes(pdf.size)}
          </div>
        </div>
      ) : (
        <Dropzone onFiles={onFiles} title="PDF wählen" hint="oder ablegen" />
      )}
    </div>
  )
}

export default function Alternate() {
  const m = useMultiPdf()
  const [reverseB, setReverseB] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<OutFile[] | null>(null)
  const [a, b] = m.pdfs

  if (result) return <ResultView tool={tool} files={result} onBack={() => setResult(null)} onReset={() => (setResult(null), m.reset())} />

  if (!m.pdfs.length)
    return (
      <UploadStage tool={tool} note="Beispiel Duplex-Scan: Datei A = alle Vorderseiten, Datei B = alle Rückseiten (meist in umgekehrter Reihenfolge).">
        <Dropzone multiple onFiles={(f) => m.add(f.slice(0, 2))} title="Zwei PDF-Dateien auswählen" />
        {m.error && (
          <div className="mt-4">
            <Alert>{m.error}</Alert>
          </div>
        )}
      </UploadStage>
    )

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      const refs: PageRef[] = []
      const n = Math.max(a.numPages, b.numPages)
      for (let i = 0; i < n; i++) {
        if (i < a.numPages) refs.push({ kind: 'page', src: 0, index: i })
        const j = reverseB ? b.numPages - 1 - i : i
        if (i < b.numPages) refs.push({ kind: 'page', src: 1, index: j })
      }
      const bytes = await assemble([a.bytes, b.bytes], refs)
      setResult([pdfOut(`${baseName(a.name)}-gemischt.pdf`, bytes)])
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
      main={
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <Slot label="Datei A (z. B. Vorderseiten)" pdf={a} onRemove={() => m.remove(a.id)} onFiles={m.add} />
          <button
            disabled={!b}
            onClick={() => m.setPdfs((p) => [p[1], p[0]])}
            className="mx-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition hover:text-brand-600 disabled:opacity-40"
            title="Tauschen"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <Slot label="Datei B (z. B. Rückseiten)" pdf={b} onRemove={() => b && m.remove(b.id)} onFiles={(f) => m.add(f.slice(0, 1))} />
        </div>
      }
      side={
        <>
          <Toggle checked={reverseB} onChange={setReverseB} label="Datei B rückwärts einfügen" hint="Für Rückseiten-Scans, die vom Stapel umgekehrt eingezogen wurden." />
          {a && b && (
            <p className="text-sm text-slate-500">
              Reihenfolge: A1, B{reverseB ? b.numPages : 1}, A2, B{reverseB ? Math.max(1, b.numPages - 1) : 2}, …
            </p>
          )}
          {(err || m.error) && <Alert>{err || m.error}</Alert>}
        </>
      }
      action={
        <Button variant="primary" size="lg" className="w-full" loading={busy} disabled={!a || !b} onClick={run}>
          Abwechselnd mischen
        </Button>
      }
    />
  )
}
