import { useState } from 'react'
import { RangeInput } from '../components/RangeInput'
import { SelectableGrid } from '../components/PageGrid'
import { SelectionToolbar } from '../components/SelectionToolbar'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Toggle } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { assemble, split } from '../lib/ops'
import { useSelection } from '../lib/useSelection'
import { toolBySlug } from './registry'

const tool = toolBySlug('extract')!

export default function Extract() {
  const sel = useSelection()
  const [separate, setSeparate] = useState(false)
  return (
    <SinglePdfTool
      tool={tool}
      actionLabel={sel.selected.size ? `${sel.selected.size} ${sel.selected.size === 1 ? 'Seite' : 'Seiten'} extrahieren` : 'Seiten extrahieren'}
      onLoaded={() => sel.set([])}
      validate={() => (sel.selected.size === 0 ? 'Wähle die Seiten aus, die extrahiert werden sollen.' : null)}
      toolbar={(pdf) => <SelectionToolbar total={pdf.numPages} count={sel.selected.size} set={sel.set} />}
      main={(pdf) => <SelectableGrid doc={pdf.doc} numPages={pdf.numPages} selected={sel.selected} onToggle={sel.toggle} />}
      side={(pdf) => (
        <>
          <RangeInput label="Seiten extrahieren" total={pdf.numPages} selected={sel.selected} onChange={sel.set} />
          <Toggle checked={separate} onChange={setSeparate} label="Jede Seite als eigene Datei" hint="Ergebnis wird als ZIP geliefert" />
        </>
      )}
      run={async (pdf) => {
        const pages = [...sel.selected].sort((a, b) => a - b)
        const base = baseName(pdf.name)
        if (separate) {
          const out = await split(pdf.bytes, pages.map((p) => [p]))
          return out.map((b, k) => pdfOut(`${base}-seite-${pages[k] + 1}.pdf`, b))
        }
        const bytes = await assemble([pdf.bytes], pages.map((index) => ({ kind: 'page', src: 0, index })))
        return [pdfOut(`${base}-auszug.pdf`, bytes)]
      }}
    />
  )
}
