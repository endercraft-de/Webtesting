import { useState } from 'react'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Field, TextInput } from '../components/ui'
import { pdfOut } from '../lib/files'
import { readMeta, writeMeta, type Meta } from '../lib/ops'
import { toolBySlug } from './registry'

const tool = toolBySlug('metadata')!
const EMPTY: Meta = { title: '', author: '', subject: '', keywords: '', creator: '', producer: '' }
const LABELS: Record<keyof Meta, string> = { title: 'Titel', author: 'Autor', subject: 'Thema', keywords: 'Stichwörter (kommagetrennt)', creator: 'Erstellt mit', producer: 'PDF-Erzeuger' }

export default function Metadata() {
  const [meta, setMeta] = useState<Meta>(EMPTY)
  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="Metadaten speichern"
      onLoaded={async (p) => setMeta(await readMeta(p.bytes).catch(() => EMPTY))}
      main={() => (
        <div className="mx-auto max-w-xl space-y-4 py-2">
          {(Object.keys(LABELS) as (keyof Meta)[]).map((k) => (
            <Field key={k} label={LABELS[k]}>
              <TextInput value={meta[k]} onChange={(e) => setMeta((m) => ({ ...m, [k]: e.target.value }))} />
            </Field>
          ))}
        </div>
      )}
      run={async (pdf) => [pdfOut(pdf.name, await writeMeta(pdf.bytes, meta))]}
    />
  )
}
