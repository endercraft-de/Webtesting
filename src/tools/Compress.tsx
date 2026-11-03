import { useState } from 'react'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Alert, Field, NumberInput, Toggle, cx } from '../components/ui'
import { baseName, formatBytes, pdfOut } from '../lib/files'
import { optimizePdf, rasterizePdf } from '../lib/raster'
import { toolBySlug } from './registry'

const tool = toolBySlug('compress')!

type Level = 'lossless' | 'low' | 'medium' | 'high' | 'custom'
const LEVELS: { value: Level; title: string; text: string; dpi: number; q: number }[] = [
  { value: 'lossless', title: 'Verlustfrei', text: 'Struktur optimieren, Inhalt bleibt unverändert', dpi: 0, q: 0 },
  { value: 'low', title: 'Geringe Kompression', text: 'Hohe Qualität · 200 dpi', dpi: 200, q: 0.8 },
  { value: 'medium', title: 'Empfohlen', text: 'Gute Qualität · 144 dpi', dpi: 144, q: 0.65 },
  { value: 'high', title: 'Starke Kompression', text: 'Kleinste Datei · 96 dpi', dpi: 96, q: 0.45 },
  { value: 'custom', title: 'Benutzerdefiniert', text: 'Auflösung und Qualität selbst wählen', dpi: 0, q: 0 },
]

export default function Compress() {
  const [level, setLevel] = useState<Level>('medium')
  const [dpi, setDpi] = useState(120)
  const [quality, setQuality] = useState(60)
  const [gray, setGray] = useState(false)

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="PDF komprimieren"
      side={() => (
        <>
          <div className="space-y-2" role="radiogroup">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                role="radio"
                aria-checked={level === l.value}
                onClick={() => setLevel(l.value)}
                className={cx(
                  'flex w-full items-start gap-3 rounded-xl p-3 text-left ring-1 transition',
                  level === l.value ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300',
                )}
              >
                <span className={cx('mt-0.5 size-4 shrink-0 rounded-full border-2', level === l.value ? 'border-[5px] border-brand-600' : 'border-slate-300')} />
                <span>
                  <span className="block text-sm font-medium text-slate-800">{l.title}</span>
                  <span className="block text-xs text-slate-500">{l.text}</span>
                </span>
              </button>
            ))}
          </div>
          {level === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Auflösung">
                <NumberInput value={dpi} onChange={setDpi} min={36} max={300} suffix="dpi" />
              </Field>
              <Field label="JPEG-Qualität">
                <NumberInput value={quality} onChange={setQuality} min={5} max={100} suffix="%" />
              </Field>
            </div>
          )}
          {level !== 'lossless' && (
            <>
              <Toggle checked={gray} onChange={setGray} label="In Graustufen umwandeln" hint="Spart zusätzlich Platz" />
              <Alert tone="info">Seiten werden als Bilder neu aufgebaut – Text ist danach nicht mehr markierbar.</Alert>
            </>
          )}
        </>
      )}
      run={async (pdf, progress) => {
        const l = LEVELS.find((x) => x.value === level)!
        const bytes =
          level === 'lossless'
            ? await optimizePdf(pdf.bytes)
            : await rasterizePdf(
                pdf.bytes,
                { dpi: level === 'custom' ? dpi : l.dpi, quality: (level === 'custom' ? quality / 100 : l.q), grayscale: gray },
                (d, t) => progress(d / t),
              )
        const before = pdf.size
        const after = bytes.byteLength
        const saved = Math.round((1 - after / before) * 100)
        return {
          files: [pdfOut(`${baseName(pdf.name)}-komprimiert.pdf`, bytes)],
          info:
            saved > 0 ? (
              <Alert tone="success">
                {formatBytes(before)} → <b>{formatBytes(after)}</b> · {saved} % kleiner
              </Alert>
            ) : (
              <Alert tone="warn">
                {formatBytes(before)} → {formatBytes(after)}. Die Datei ist bereits gut komprimiert – probiere eine stärkere Stufe.
              </Alert>
            ),
        }
      }}
    />
  )
}
