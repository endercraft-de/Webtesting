/**
 * Parses page range expressions like "1-3, 5, 8-" or "ungerade".
 * Returns groups of 0-based page indexes. Invalid parts throw an Error with a German message.
 */
export function parseRangeGroups(input: string, total: number): number[][] {
  const text = input.trim().toLowerCase()
  if (!text) throw new Error('Bitte einen Seitenbereich angeben.')
  const groups: number[][] = []
  for (const raw of text.split(/[,;]/)) {
    const part = raw.trim()
    if (!part) continue
    if (part === 'alle' || part === 'all') {
      groups.push(seq(0, total - 1))
      continue
    }
    if (part === 'gerade' || part === 'even') {
      groups.push(seq(0, total - 1).filter((i) => i % 2 === 1))
      continue
    }
    if (part === 'ungerade' || part === 'odd') {
      groups.push(seq(0, total - 1).filter((i) => i % 2 === 0))
      continue
    }
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/)
    if (m) {
      const from = m[1] ? parseInt(m[1], 10) : 1
      const to = m[2] ? parseInt(m[2], 10) : total
      if (from < 1 || to > total || from > to) throw new Error(`Ungültiger Bereich „${part}“ (Dokument hat ${total} Seiten).`)
      groups.push(seq(from - 1, to - 1))
      continue
    }
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10)
      if (n < 1 || n > total) throw new Error(`Seite ${n} existiert nicht (Dokument hat ${total} Seiten).`)
      groups.push([n - 1])
      continue
    }
    throw new Error(`Unverständliche Angabe „${part}“. Beispiel: 1-3, 5, 8-`)
  }
  if (!groups.length) throw new Error('Bitte einen Seitenbereich angeben.')
  return groups
}

export function parseRangeSet(input: string, total: number): number[] {
  const set = new Set(parseRangeGroups(input, total).flat())
  return [...set].sort((a, b) => a - b)
}

export function seq(from: number, to: number): number[] {
  const out: number[] = []
  for (let i = from; i <= to; i++) out.push(i)
  return out
}

/** Turns a list of 0-based indexes into a compact "1-3, 5" string. */
export function formatRanges(indexes: number[]): string {
  const s = [...new Set(indexes)].sort((a, b) => a - b)
  const parts: string[] = []
  let i = 0
  while (i < s.length) {
    let j = i
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++
    parts.push(i === j ? `${s[i] + 1}` : `${s[i] + 1}-${s[j] + 1}`)
    i = j + 1
  }
  return parts.join(', ')
}
