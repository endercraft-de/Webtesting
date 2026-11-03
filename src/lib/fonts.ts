import type { CSSProperties } from 'react'
import type { FontName } from './ops'

export const FONT_OPTIONS: { value: FontName; label: string }[] = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Helvetica Fett', label: 'Helvetica Fett' },
  { value: 'Times', label: 'Times' },
  { value: 'Times Fett', label: 'Times Fett' },
  { value: 'Courier', label: 'Courier' },
]

export function cssFont(f: FontName): CSSProperties {
  const family = f.startsWith('Helvetica') ? 'Helvetica, Arial, sans-serif' : f.startsWith('Times') ? '"Times New Roman", Times, serif' : '"Courier New", Courier, monospace'
  return { fontFamily: family, fontWeight: f.endsWith('Fett') ? 700 : 400 }
}
