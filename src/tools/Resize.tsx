import { useState } from 'react'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Field, NumberInput, Segmented } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { PAGE_SIZES, resize } from '../lib/ops'
import { toolBySlug } from './registry'

const tool = toolBySlug('resize')!

export default function Resize() {
  const [size, setSize] = useState('A4')
  const [margin, setMargin] = useState(0)
  return (
    <SinglePdfTool
      tool={tool}
      actionLabel={`Auf ${size} skalieren`}
      side={() => (
        <>
          <Field label="Zielformat" hint="Hoch- oder Querformat wird je Seite automatisch beibehalten.">
            <Segmented value={size} onChange={setSize} options={Object.keys(PAGE_SIZES).map((k) => ({ value: k, label: k }))} />
          </Field>
          <Field label="Rand">
            <NumberInput value={margin} onChange={setMargin} min={0} max={50} suffix="mm" />
          </Field>
        </>
      )}
      run={async (pdf) => {
        const bytes = await resize(pdf.bytes, PAGE_SIZES[size], (margin * 72) / 25.4)
        return [pdfOut(`${baseName(pdf.name)}-${size}.pdf`, bytes)]
      }}
    />
  )
}
