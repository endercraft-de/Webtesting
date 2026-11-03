import { useState } from 'react'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Alert, Field, Segmented } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { rasterizePdf } from '../lib/raster'
import { toolBySlug } from './registry'

const tool = toolBySlug('grayscale')!

export default function Grayscale() {
  const [dpi, setDpi] = useState(150)
  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="In Graustufen umwandeln"
      side={() => (
        <>
          <Field label="Qualität">
            <Segmented
              value={dpi}
              onChange={setDpi}
              options={[
                { value: 100, label: 'Klein' },
                { value: 150, label: 'Normal' },
                { value: 220, label: 'Hoch' },
              ]}
            />
          </Field>
          <Alert tone="info">Seiten werden als Graustufen-Bilder neu aufgebaut – Text ist danach nicht mehr markierbar.</Alert>
        </>
      )}
      run={async (pdf, progress) => {
        const bytes = await rasterizePdf(pdf.bytes, { dpi, quality: 0.8, grayscale: true }, (d, t) => progress(d / t))
        return [pdfOut(`${baseName(pdf.name)}-graustufen.pdf`, bytes)]
      }}
    />
  )
}
