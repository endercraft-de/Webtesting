import { useEffect, useState } from 'react'
import { parseRangeSet, seq } from '../lib/ranges'
import { Field, Segmented, TextInput } from './ui'

export type Scope = { mode: 'all' | 'odd' | 'even' | 'custom'; text: string }

export function resolveScope(s: Scope, total: number): number[] {
  const all = seq(0, total - 1)
  if (s.mode === 'odd') return all.filter((i) => i % 2 === 0)
  if (s.mode === 'even') return all.filter((i) => i % 2 === 1)
  if (s.mode === 'custom') return parseRangeSet(s.text, total)
  return all
}

/** "Apply to which pages" control. */
export function PageScope({ value, onChange, total }: { value: Scope; onChange: (s: Scope) => void; total: number }) {
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (value.mode !== 'custom') return setErr(null)
    try {
      parseRangeSet(value.text, total)
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [value, total])
  return (
    <Field label="Seiten" hint={err ? <span className="text-red-600">{err}</span> : undefined}>
      <Segmented
        value={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        options={[
          { value: 'all', label: 'Alle' },
          { value: 'odd', label: 'Ungerade' },
          { value: 'even', label: 'Gerade' },
          { value: 'custom', label: 'Eigene' },
        ]}
      />
      {value.mode === 'custom' && <TextInput className="mt-2" placeholder="z. B. 2-5, 8" value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} />}
    </Field>
  )
}
