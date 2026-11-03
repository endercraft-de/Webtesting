import { seq } from '../lib/ranges'
import { Button } from './ui'

export function SelectionToolbar({ total, count, set }: { total: number; count: number; set: (i: number[]) => void }) {
  const all = seq(0, total - 1)
  return (
    <>
      <Button size="sm" onClick={() => set(all)}>
        Alle
      </Button>
      <Button size="sm" onClick={() => set([])}>
        Keine
      </Button>
      <Button size="sm" onClick={() => set(all.filter((i) => i % 2 === 0))}>
        Ungerade
      </Button>
      <Button size="sm" onClick={() => set(all.filter((i) => i % 2 === 1))}>
        Gerade
      </Button>
      <span className="ml-auto text-sm text-slate-500">
        <b className="text-slate-800">{count}</b> von {total} ausgewählt
        <span className="hidden text-xs text-slate-400 md:inline"> · Umschalt + Klick wählt Bereiche</span>
      </span>
    </>
  )
}
