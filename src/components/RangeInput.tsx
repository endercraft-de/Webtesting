import { useEffect, useState } from 'react'
import { formatRanges, parseRangeSet } from '../lib/ranges'
import { Field, TextInput } from './ui'

/** Text input for page ranges that stays in sync with a page selection. */
export function RangeInput({
  label = 'Seiten',
  total,
  selected,
  onChange,
  placeholder = 'z. B. 1-3, 5, 8-',
}: {
  label?: string
  total: number
  selected: Set<number>
  onChange: (idx: number[]) => void
  placeholder?: string
}) {
  const [text, setText] = useState(formatRanges([...selected]))
  const [err, setErr] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(formatRanges([...selected]))
  }, [selected, focused])

  return (
    <Field label={label} hint={err ? <span className="text-red-600">{err}</span> : 'Kommagetrennt, z. B. 1-3, 7, 10- · auch „gerade“ / „ungerade“'}>
      <TextInput
        value={text}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value)
          if (!e.target.value.trim()) {
            setErr(null)
            onChange([])
            return
          }
          try {
            onChange(parseRangeSet(e.target.value, total))
            setErr(null)
          } catch (x) {
            setErr((x as Error).message)
          }
        }}
      />
    </Field>
  )
}
