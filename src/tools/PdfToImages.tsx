import { useState } from 'react'
import { PageScope, resolveScope, type Scope } from '../components/PageScope'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Field, Segmented } from '../components/ui'
import { baseName } from '../lib/files'
import { pdfToImages } from '../lib/raster'
import { toolBySlug } from './registry'

const tool = toolBySlug('pdf-to-images')!

export default function PdfToImages() {
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg')
  const [dpi, setDpi] = useState(150)
  const [scope, setScope] = useState<Scope>({ mode: 'all', text: '' })
  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="In Bilder umwandeln"
      validate={(pdf) => {
        try {
          return resolveScope(scope, pdf.numPages).length ? null : 'Keine Seiten ausgewählt.'
        } catch (e) {
          return (e as Error).message
        }
      }}
      side={(pdf) => (
        <>
          <Field label="Format">
            <Segmented value={format} onChange={setFormat} options={[{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }]} />
          </Field>
          <Field label="Auflösung">
            <Segmented
              value={dpi}
              onChange={setDpi}
              options={[
                { value: 72, label: '72 dpi' },
                { value: 150, label: '150 dpi' },
                { value: 300, label: '300 dpi' },
              ]}
            />
          </Field>
          <PageScope value={scope} onChange={setScope} total={pdf.numPages} />
        </>
      )}
      run={async (pdf, progress) => {
        const imgs = await pdfToImages(pdf.bytes, resolveScope(scope, pdf.numPages), { dpi, format, quality: 0.9 }, (d, t) => progress(d / t))
        const base = baseName(pdf.name)
        return imgs.map((im) => ({ name: `${base}-seite-${im.index + 1}.${format}`, bytes: im.bytes, type: format === 'png' ? 'image/png' : 'image/jpeg' }))
      }}
    />
  )
}
