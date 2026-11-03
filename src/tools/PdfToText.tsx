import { SinglePdfTool } from '../components/SinglePdfTool'
import { Alert } from '../components/ui'
import { baseName } from '../lib/files'
import { pdfToText } from '../lib/raster'
import { toolBySlug } from './registry'

const tool = toolBySlug('pdf-to-text')!

export default function PdfToText() {
  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="Text extrahieren"
      side={() => <Alert tone="info">Gescannte Dokumente ohne Textebene enthalten keinen extrahierbaren Text.</Alert>}
      run={async (pdf, progress) => {
        const text = await pdfToText(pdf.bytes, (d, t) => progress(d / t))
        const bytes = new TextEncoder().encode(text)
        return {
          files: [{ name: `${baseName(pdf.name)}.txt`, bytes, type: 'text/plain;charset=utf-8' }],
          info: <pre className="max-h-64 overflow-auto rounded-xl bg-slate-50 p-4 text-left text-xs whitespace-pre-wrap text-slate-600 ring-1 ring-slate-100">{text.slice(0, 4000) || '(kein Text gefunden)'}</pre>,
        }
      }}
    />
  )
}
