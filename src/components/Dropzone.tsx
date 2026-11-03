import { FilePlus2, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { isImage, isPdf } from '../lib/files'
import { cx } from './ui'

export type Accept = 'pdf' | 'image'

function filter(files: FileList | File[], accept: Accept) {
  return [...files].filter((f) => (accept === 'pdf' ? isPdf(f) : isImage(f)))
}

export function Dropzone({
  accept = 'pdf',
  multiple = false,
  onFiles,
  title,
  hint,
}: {
  accept?: Accept
  multiple?: boolean
  onFiles: (files: File[]) => void
  title?: ReactNode
  hint?: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [warn, setWarn] = useState<string | null>(null)

  const handle = (list: FileList | File[]) => {
    const ok = filter(list, accept)
    if (!ok.length) {
      setWarn(accept === 'pdf' ? 'Bitte eine PDF-Datei wählen.' : 'Bitte Bilddateien (JPG, PNG, WebP …) wählen.')
      return
    }
    setWarn(null)
    onFiles(multiple ? ok : ok.slice(0, 1))
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        handle(e.dataTransfer.files)
      }}
      onClick={() => input.current?.click()}
      className={cx(
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition sm:py-20',
        over ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/40',
      )}
    >
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={accept === 'pdf' ? 'application/pdf,.pdf' : 'image/*'}
        onChange={(e) => {
          if (e.target.files) handle(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition group-hover:scale-105">
        <Upload className="size-7" />
      </div>
      <div className="text-lg font-semibold text-slate-900">
        {title ?? (accept === 'pdf' ? (multiple ? 'PDF-Dateien auswählen' : 'PDF-Datei auswählen') : 'Bilder auswählen')}
      </div>
      <div className="mt-1 text-sm text-slate-500">{hint ?? 'oder hierher ziehen und ablegen'}</div>
      {warn && <div className="mt-3 text-sm font-medium text-red-600">{warn}</div>}
    </div>
  )
}

/** Small "add more files" button. */
export function AddFilesButton({ accept = 'pdf', onFiles, label = 'Dateien hinzufügen' }: { accept?: Accept; onFiles: (f: File[]) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept={accept === 'pdf' ? 'application/pdf,.pdf' : 'image/*'}
        onChange={(e) => {
          if (e.target.files) onFiles(filter(e.target.files, accept))
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50"
      >
        <FilePlus2 className="size-4" />
        {label}
      </button>
    </>
  )
}
