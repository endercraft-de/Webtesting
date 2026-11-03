import { FileText } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatBytes, readFile, type OutFile } from '../lib/files'
import { LoadCancelled, usePdfLoader, type LoadedPdf } from '../lib/loader'
import { takeHandoff } from '../lib/store'
import type { Tool } from '../tools/registry'
import { Dropzone } from './Dropzone'
import { PreviewGrid } from './PageGrid'
import { ResultView } from './ResultView'
import { UploadStage, Workspace } from './ToolLayout'
import { Alert, Button, ProgressBar } from './ui'

export type RunResult = OutFile[] | { files: OutFile[]; info?: ReactNode }
export type ProgressFn = (fraction: number) => void

/** Loads a single PDF (from upload or hand-over) and returns state helpers. */
export function useSinglePdf(onLoaded?: (pdf: LoadedPdf) => void) {
  const loader = usePdfLoader()
  const [pdf, setPdf] = useState<LoadedPdf | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cb = useRef(onLoaded)
  cb.current = onLoaded

  const open = async (name: string, bytes: Uint8Array) => {
    setError(null)
    setLoading(true)
    try {
      const p = await loader(name, bytes)
      cb.current?.(p)
      setPdf(p)
    } catch (e) {
      if (!(e instanceof LoadCancelled)) setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const h = takeHandoff()
    if (h?.[0]) open(h[0].name, h[0].bytes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openFile = async (f: File) => open(f.name, await readFile(f))
  const reset = () => {
    pdf?.doc.destroy()
    setPdf(null)
    setError(null)
  }
  return { pdf, loading, error, openFile, reset }
}

export function FileBadge({ pdf }: { pdf: LoadedPdf }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
        <FileText className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-800" title={pdf.name}>
          {pdf.name}
        </div>
        <div className="text-xs text-slate-500">
          {pdf.numPages} {pdf.numPages === 1 ? 'Seite' : 'Seiten'} · {formatBytes(pdf.size)}
        </div>
      </div>
    </div>
  )
}

export function SinglePdfTool({
  tool,
  actionLabel,
  run,
  side,
  main,
  toolbar,
  onLoaded,
  validate,
  uploadNote,
}: {
  tool: Tool
  actionLabel: string
  run: (pdf: LoadedPdf, progress: ProgressFn) => Promise<RunResult>
  side?: (pdf: LoadedPdf) => ReactNode
  main?: (pdf: LoadedPdf) => ReactNode
  toolbar?: (pdf: LoadedPdf) => ReactNode
  onLoaded?: (pdf: LoadedPdf) => void
  /** return an error message to block the action */
  validate?: (pdf: LoadedPdf) => string | null
  uploadNote?: ReactNode
}) {
  const { pdf, loading, error, openFile, reset } = useSinglePdf(onLoaded)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [result, setResult] = useState<{ files: OutFile[]; info?: ReactNode } | null>(null)

  const doReset = () => {
    setResult(null)
    setRunError(null)
    reset()
  }

  if (result) return <ResultView tool={tool} files={result.files} info={result.info} onReset={doReset} onBack={() => setResult(null)} />

  if (!pdf) {
    return (
      <UploadStage tool={tool} note={uploadNote}>
        {loading ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white py-20 ring-1 ring-slate-200">
            <div className="size-8 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
            <span className="text-sm text-slate-500">Datei wird geöffnet …</span>
          </div>
        ) : (
          <Dropzone onFiles={(f) => openFile(f[0])} />
        )}
        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
      </UploadStage>
    )
  }

  const blocked = validate?.(pdf) ?? null
  const go = async () => {
    setBusy(true)
    setRunError(null)
    setProgress(null)
    try {
      const r = await run(pdf, setProgress)
      setResult(Array.isArray(r) ? { files: r } : r)
    } catch (e) {
      console.error(e)
      setRunError((e as Error).message || 'Unbekannter Fehler')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Workspace
      tool={tool}
      onReset={doReset}
      toolbar={toolbar?.(pdf)}
      main={main ? main(pdf) : <PreviewGrid doc={pdf.doc} numPages={pdf.numPages} />}
      side={
        <>
          <FileBadge pdf={pdf} />
          {side?.(pdf)}
          {runError && <Alert>{runError}</Alert>}
          {blocked && <Alert tone="warn">{blocked}</Alert>}
        </>
      }
      action={
        <div className="space-y-2">
          {busy && progress !== null && <ProgressBar value={progress} />}
          <Button variant="primary" size="lg" className="w-full" loading={busy} disabled={!!blocked} onClick={go}>
            {actionLabel}
          </Button>
        </div>
      }
    />
  )
}
