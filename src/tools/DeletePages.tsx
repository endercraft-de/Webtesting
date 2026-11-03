import { RangeInput } from '../components/RangeInput'
import { SelectableGrid } from '../components/PageGrid'
import { SelectionToolbar } from '../components/SelectionToolbar'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { baseName, pdfOut } from '../lib/files'
import { assemble } from '../lib/ops'
import { useSelection } from '../lib/useSelection'
import { toolBySlug } from './registry'

const tool = toolBySlug('delete')!

export default function DeletePages() {
  const sel = useSelection()
  return (
    <SinglePdfTool
      tool={tool}
      actionLabel={sel.selected.size ? `${sel.selected.size} ${sel.selected.size === 1 ? 'Seite' : 'Seiten'} löschen` : 'Seiten löschen'}
      onLoaded={() => sel.set([])}
      validate={(pdf) =>
        sel.selected.size === 0 ? 'Wähle die Seiten aus, die entfernt werden sollen.' : sel.selected.size >= pdf.numPages ? 'Es muss mindestens eine Seite übrig bleiben.' : null
      }
      toolbar={(pdf) => <SelectionToolbar total={pdf.numPages} count={sel.selected.size} set={sel.set} />}
      main={(pdf) => <SelectableGrid doc={pdf.doc} numPages={pdf.numPages} selected={sel.selected} onToggle={sel.toggle} tone="red" dimSelected />}
      side={(pdf) => <RangeInput label="Zu löschende Seiten" total={pdf.numPages} selected={sel.selected} onChange={sel.set} />}
      run={async (pdf) => {
        const keep = Array.from({ length: pdf.numPages }, (_, i) => i).filter((i) => !sel.selected.has(i))
        const bytes = await assemble([pdf.bytes], keep.map((index) => ({ kind: 'page', src: 0, index })))
        return [pdfOut(`${baseName(pdf.name)}-bearbeitet.pdf`, bytes)]
      }}
    />
  )
}
