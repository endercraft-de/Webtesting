import { useCallback, useRef, useState } from 'react'
import { seq } from './ranges'

/** Page selection with shift-click range support. */
export function useSelection(initial: number[] = []) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initial))
  const last = useRef<number | null>(null)

  const toggle = useCallback((i: number, shift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (shift && last.current !== null) {
        const [a, b] = [Math.min(last.current, i), Math.max(last.current, i)]
        const on = !prev.has(i)
        for (const k of seq(a, b)) on ? next.add(k) : next.delete(k)
      } else if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
    last.current = i
  }, [])

  const set = useCallback((idx: number[]) => setSelected(new Set(idx)), [])
  return { selected, toggle, set }
}
