import { Scissors } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageCard, gridCls } from '../components/PageGrid'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Field, NumberInput, Segmented, TextInput, cx } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import type { LoadedPdf } from '../lib/loader'
import { split } from '../lib/ops'
import { parseRangeGroups, seq } from '../lib/ranges'
import { toolBySlug } from './registry'

const tool = toolBySlug('split')!
type Mode = 'manual' | 'each' | 'every' | 'ranges'

const COLORS = ['bg-brand-100 text-brand-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700']

export default function Split() {
  const [mode, setMode] = useState<Mode>('manual')
  const [every, setEvery] = useState(2)
  const [ranges, setRanges] = useState('')
  const [cuts, setCuts] = useState<Set<number>>(new Set())
  const [total, setTotal] = useState(0)

  const { groups, error } = useMemo((): { groups: number[][]; error: string | null } => {
    if (!total) return { groups: [], error: null }
    try {
      if (mode === 'each') return { groups: seq(0, total - 1).map((i) => [i]), error: null }
      if (mode === 'every') {
        const n = Math.max(1, every || 1)
        const g: number[][] = []
        for (let i = 0; i < total; i += n) g.push(seq(i, Math.min(total, i + n) - 1))
        return { groups: g, error: null }
      }
      if (mode === 'ranges') return { groups: ranges.trim() ? parseRangeGroups(ranges, total) : [], error: ranges.trim() ? null : 'Bitte Bereiche eingeben, z. B. 1-3, 4-8, 9-' }
      const g: number[][] = [[]]
      for (let i = 0; i < total; i++) {
        g[g.length - 1].push(i)
        if (cuts.has(i) && i < total - 1) g.push([])
      }
      return { groups: g, error: g.length < 2 ? 'Klicke zwischen die Seiten (Schere), um Trennstellen zu setzen.' : null }
    } catch (e) {
      return { groups: [], error: (e as Error).message }
    }
  }, [mode, every, ranges, cuts, total])

  const partOf = useMemo(() => {
    const m = new Map<number, number>()
    groups.forEach((g, k) => g.forEach((p) => (m.has(p) ? null : m.set(p, k))))
    return m
  }, [groups])

  const toggleCut = (i: number) =>
    setCuts((c) => {
      const n = new Set(c)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })

  const main = (pdf: LoadedPdf) => (
    <div className={gridCls}>
      {Array.from({ length: pdf.numPages }, (_, i) => {
        const part = partOf.get(i)
        return (
          <div key={i} className="relative">
            <PageCard
              doc={pdf.doc}
              index={i}
              dimmed={mode === 'ranges' && part === undefined && !!groups.length}
              label={
                <>
                  <span>{i + 1}</span>
                  {part !== undefined && <span className={cx('rounded-full px-1.5 py-px text-[10px] font-semibold', COLORS[part % COLORS.length])}>Teil {part + 1}</span>}
                </>
              }
            />
            {mode === 'manual' && i < pdf.numPages - 1 && (
              <button
                onClick={() => toggleCut(i)}
                title={cuts.has(i) ? 'Trennstelle entfernen' : 'Hier trennen'}
                className={cx(
                  'absolute -right-[18px] top-[42%] z-10 flex size-7 items-center justify-center rounded-full ring-1 transition',
                  cuts.has(i) ? 'bg-rose-500 text-white ring-rose-500 shadow-md' : 'bg-white text-slate-400 ring-slate-200 hover:text-rose-500 hover:ring-rose-300',
                )}
              >
                <Scissors className="size-3.5" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel={groups.length > 1 ? `In ${groups.length} Dateien teilen` : 'PDF teilen'}
      onLoaded={(p) => {
        setTotal(p.numPages)
        setCuts(new Set())
      }}
      validate={(pdf) => (pdf.numPages < 2 ? 'Die PDF hat nur eine Seite.' : error ?? (groups.length < 1 ? 'Keine Seiten ausgewählt.' : null))}
      main={main}
      side={() => (
        <>
          <Field label="Aufteilen">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'manual', label: 'Manuell' },
                { value: 'each', label: 'Jede Seite' },
                { value: 'every', label: 'Alle N' },
                { value: 'ranges', label: 'Bereiche' },
              ]}
            />
          </Field>
          {mode === 'manual' && <p className="text-sm text-slate-500">Klicke auf die Schere zwischen zwei Seiten, um dort zu trennen.</p>}
          {mode === 'each' && <p className="text-sm text-slate-500">Jede Seite wird zu einer eigenen PDF.</p>}
          {mode === 'every' && (
            <Field label="Seiten pro Datei">
              <NumberInput value={every} onChange={setEvery} min={1} max={Math.max(1, total)} />
            </Field>
          )}
          {mode === 'ranges' && (
            <Field label="Bereiche" hint="Jeder Bereich wird eine Datei. Beispiel: 1-3, 4-8, 9-">
              <TextInput value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 4-8, 9-" />
            </Field>
          )}
        </>
      )}
      run={async (pdf) => {
        const parts = await split(pdf.bytes, groups)
        const base = baseName(pdf.name)
        return parts.map((b, k) => {
          const g = groups[k]
          const label = g.length === 1 ? `${g[0] + 1}` : `${g[0] + 1}-${g[g.length - 1] + 1}`
          return pdfOut(`${base}-${label}.pdf`, b)
        })
      }}
    />
  )
}
