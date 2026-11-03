import { useState } from 'react'
import { PagePager, PagePreview } from '../components/PagePreview'
import { PageScope, resolveScope, type Scope } from '../components/PageScope'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { ColorInput, Field, NumberInput, Select, Segmented, TextInput } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { cssFont, FONT_OPTIONS } from '../lib/fonts'
import { watermark, type FontName } from '../lib/ops'
import { toolBySlug } from './registry'

const tool = toolBySlug('watermark')!

export default function Watermark() {
  const [text, setText] = useState('VERTRAULICH')
  const [fontSize, setFontSize] = useState(64)
  const [color, setColor] = useState('#dc2626')
  const [opacity, setOpacity] = useState(25)
  const [angle, setAngle] = useState(45)
  const [font, setFont] = useState<FontName>('Helvetica Fett')
  const [scope, setScope] = useState<Scope>({ mode: 'all', text: '' })
  const [page, setPage] = useState(0)

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="Wasserzeichen hinzufügen"
      onLoaded={() => setPage(0)}
      validate={(pdf) => {
        if (!text.trim()) return 'Bitte einen Text eingeben.'
        try {
          return resolveScope(scope, pdf.numPages).length ? null : 'Keine Seiten ausgewählt.'
        } catch (e) {
          return (e as Error).message
        }
      }}
      toolbar={(pdf) => (
        <>
          <span className="text-sm font-medium text-slate-700">Vorschau</span>
          <span className="ml-auto">
            <PagePager index={page} total={pdf.numPages} onChange={setPage} />
          </span>
        </>
      )}
      main={(pdf) => (
        <PagePreview
          doc={pdf.doc}
          index={page}
          overlay={(s) => (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <div
                className="whitespace-nowrap leading-none"
                style={{ ...cssFont(font), fontSize: fontSize * s, color, opacity: opacity / 100, transform: `rotate(${-angle}deg)` }}
              >
                {text}
              </div>
            </div>
          )}
        />
      )}
      side={(pdf) => (
        <>
          <Field label="Text">
            <TextInput value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Schrift">
              <Select value={font} onChange={setFont} options={FONT_OPTIONS} />
            </Field>
            <Field label="Größe">
              <NumberInput value={fontSize} onChange={setFontSize} min={6} max={300} suffix="pt" />
            </Field>
          </div>
          <Field label="Farbe">
            <ColorInput value={color} onChange={setColor} />
          </Field>
          <Field label={`Deckkraft: ${opacity} %`}>
            <input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="w-full" />
          </Field>
          <Field label="Ausrichtung">
            <Segmented
              value={angle}
              onChange={setAngle}
              options={[
                { value: 0, label: 'Waagerecht' },
                { value: 45, label: 'Diagonal' },
                { value: 90, label: 'Senkrecht' },
              ]}
            />
          </Field>
          <PageScope value={scope} onChange={setScope} total={pdf.numPages} />
        </>
      )}
      run={async (pdf) => {
        const bytes = await watermark(pdf.bytes, { text, fontSize, color, opacity: opacity / 100, angle, font, pages: resolveScope(scope, pdf.numPages) })
        return [pdfOut(`${baseName(pdf.name)}-wasserzeichen.pdf`, bytes)]
      }}
    />
  )
}
