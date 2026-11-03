import { useState } from 'react'
import { PagePager, PagePreview } from '../components/PagePreview'
import { PageScope, resolveScope, type Scope } from '../components/PageScope'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { ColorInput, Field, NumberInput, Select, cx } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { cssFont, FONT_OPTIONS } from '../lib/fonts'
import { addPageNumbers, type FontName, type Pos } from '../lib/ops'
import { toolBySlug } from './registry'

const tool = toolBySlug('page-numbers')!

const FORMATS = [
  { value: '{n}', label: '1, 2, 3 …' },
  { value: 'Seite {n}', label: 'Seite 1' },
  { value: 'Seite {n} von {total}', label: 'Seite 1 von 10' },
  { value: '{n} / {total}', label: '1 / 10' },
  { value: '- {n} -', label: '- 1 -' },
]
const POS: Pos[] = ['tl', 'tc', 'tr', 'bl', 'bc', 'br']

export default function PageNumbers() {
  const [format, setFormat] = useState('Seite {n} von {total}')
  const [position, setPosition] = useState<Pos>('bc')
  const [start, setStart] = useState(1)
  const [fontSize, setFontSize] = useState(10)
  const [margin, setMargin] = useState(10)
  const [color, setColor] = useState('#000000')
  const [font, setFont] = useState<FontName>('Helvetica')
  const [scope, setScope] = useState<Scope>({ mode: 'all', text: '' })
  const [page, setPage] = useState(0)

  const mm = (v: number) => (v * 72) / 25.4
  const pagesOf = (n: number) => {
    try {
      return resolveScope(scope, n)
    } catch {
      return []
    }
  }

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="Seitenzahlen hinzufügen"
      onLoaded={() => setPage(0)}
      validate={(pdf) => (pagesOf(pdf.numPages).length ? null : 'Keine (gültigen) Seiten ausgewählt.')}
      toolbar={(pdf) => (
        <>
          <span className="text-sm font-medium text-slate-700">Vorschau</span>
          <span className="ml-auto">
            <PagePager index={page} total={pdf.numPages} onChange={setPage} />
          </span>
        </>
      )}
      main={(pdf) => {
        const pages = pagesOf(pdf.numPages)
        const k = pages.indexOf(page)
        const label =
          k < 0
            ? null
            : format
                .replaceAll('{n}', String(k + start))
                .replaceAll('{total}', String(pages.length + start - 1))
                .replaceAll('{p}', String(page + 1))
        return (
          <PagePreview
            doc={pdf.doc}
            index={page}
            overlay={(s) =>
              label && (
                <div
                  className="pointer-events-none absolute whitespace-nowrap leading-none"
                  style={{
                    ...cssFont(font),
                    fontSize: fontSize * s,
                    color,
                    [position[0] === 't' ? 'top' : 'bottom']: mm(margin) * s,
                    ...(position[1] === 'l' ? { left: mm(margin) * s } : position[1] === 'r' ? { right: mm(margin) * s } : { left: '50%', transform: 'translateX(-50%)' }),
                  }}
                >
                  {label}
                </div>
              )
            }
          />
        )
      }}
      side={(pdf) => (
        <>
          <Field label="Position">
            <div className="grid w-40 grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-2">
              {POS.map((p) => (
                <button
                  key={p}
                  title={p}
                  onClick={() => setPosition(p)}
                  className={cx(
                    'flex h-9 rounded-md p-1.5 transition',
                    p[0] === 't' ? 'items-start' : 'items-end',
                    p[1] === 'l' ? 'justify-start' : p[1] === 'r' ? 'justify-end' : 'justify-center',
                    position === p ? 'bg-brand-600' : 'bg-white hover:bg-brand-50',
                    p === 'bl' && 'col-start-1 row-start-3',
                  )}
                >
                  <span className={cx('h-1 w-3 rounded-full', position === p ? 'bg-white' : 'bg-slate-300')} />
                </button>
              ))}
              <div className="col-span-3 row-start-2 h-6" />
            </div>
          </Field>
          <Field label="Format" hint="Platzhalter: {n} = Nummer, {total} = Gesamtzahl, {p} = tatsächliche Seite">
            <Select value={FORMATS.some((f) => f.value === format) ? format : '__custom'} onChange={(v) => setFormat(v === '__custom' ? format : v)} options={[...FORMATS, { value: '__custom', label: 'Eigenes Format …' }]} />
            <input className="mt-2 h-9 w-full rounded-lg bg-slate-50 px-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500" value={format} onChange={(e) => setFormat(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Startnummer">
              <NumberInput value={start} onChange={setStart} min={0} />
            </Field>
            <Field label="Abstand">
              <NumberInput value={margin} onChange={setMargin} min={0} max={100} suffix="mm" />
            </Field>
            <Field label="Schrift">
              <Select value={font} onChange={setFont} options={FONT_OPTIONS} />
            </Field>
            <Field label="Größe">
              <NumberInput value={fontSize} onChange={setFontSize} min={5} max={72} suffix="pt" />
            </Field>
          </div>
          <Field label="Farbe">
            <ColorInput value={color} onChange={setColor} />
          </Field>
          <PageScope value={scope} onChange={setScope} total={pdf.numPages} />
        </>
      )}
      run={async (pdf) => {
        const bytes = await addPageNumbers(pdf.bytes, { format, position, start, fontSize, margin: mm(margin), color, font, pages: resolveScope(scope, pdf.numPages) })
        return [pdfOut(`${baseName(pdf.name)}-nummeriert.pdf`, bytes)]
      }}
    />
  )
}
