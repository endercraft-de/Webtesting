import { ArrowRight, Check, Download, FileArchive, FileText, ImageIcon, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { downloadBlob, downloadFile, formatBytes, zipFiles, type OutFile } from '../lib/files'
import { setHandoff } from '../lib/store'
import { TOOLS, type Tool } from '../tools/registry'
import { Button } from './ui'

export function ResultView({
  tool,
  files,
  onReset,
  onBack,
  info,
  zipName = 'pdfwerk.zip',
}: {
  tool: Tool
  files: OutFile[]
  onReset: () => void
  onBack?: () => void
  info?: ReactNode
  zipName?: string
}) {
  const nav = useNavigate()
  const [zipping, setZipping] = useState(false)
  const pdfs = files.filter((f) => f.type === 'application/pdf')
  const next = TOOLS.filter((t) => t.slug !== tool.slug && t.input !== 'images')

  const downloadAll = async () => {
    setZipping(true)
    try {
      downloadBlob(await zipFiles(files), zipName)
    } finally {
      setZipping(false)
    }
  }

  const continueWith = (t: Tool) => {
    setHandoff(t.input === 'pdfs' ? pdfs : pdfs.slice(0, 1))
    nav(`/${t.slug}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="animate-pop rounded-3xl bg-white p-6 text-center ring-1 ring-slate-200 sm:p-10">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="size-7" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Fertig!</h2>
        <p className="mt-1 text-slate-500">{files.length === 1 ? 'Deine Datei ist bereit.' : `${files.length} Dateien sind bereit.`}</p>
        {info && <div className="mt-4">{info}</div>}

        <div className="mt-6 flex flex-col items-center gap-3">
          {files.length === 1 ? (
            <Button variant="primary" size="lg" icon={<Download className="size-5" />} onClick={() => downloadFile(files[0])}>
              Herunterladen
            </Button>
          ) : (
            <Button variant="primary" size="lg" loading={zipping} icon={<FileArchive className="size-5" />} onClick={downloadAll}>
              Alle als ZIP herunterladen
            </Button>
          )}
        </div>

        <ul className="mt-6 max-h-72 divide-y divide-slate-100 overflow-auto rounded-xl text-left ring-1 ring-slate-100">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              {f.type.startsWith('image/') ? <ImageIcon className="size-4 shrink-0 text-slate-400" /> : <FileText className="size-4 shrink-0 text-slate-400" />}
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{f.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{formatBytes(f.bytes.byteLength)}</span>
              <button onClick={() => downloadFile(f)} className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title="Herunterladen">
                <Download className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              Zurück zur Bearbeitung
            </Button>
          )}
          <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={onReset}>
            Neue Datei
          </Button>
        </div>
      </div>

      {pdfs.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-center text-sm font-semibold text-slate-500">Weiter bearbeiten mit …</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {next.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.slug}
                  onClick={() => continueWith(t)}
                  className="group inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:ring-brand-300"
                >
                  <span className={`flex size-6 items-center justify-center rounded-full ${t.tone}`}>
                    <Icon className="size-3.5" />
                  </span>
                  {t.title}
                  <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
