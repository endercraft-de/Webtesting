import type { LucideIcon } from 'lucide-react'
import {
  Combine, Scissors, LayoutGrid, RotateCw, Trash2, FileOutput, Minimize2, PenLine, Signature, Stamp, Hash, Crop,
  ImagePlus, FileImage, FileText, Info, Lock, LockOpen, TextCursorInput, Shuffle, Maximize2, Contrast,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type Category = 'Organisieren' | 'Bearbeiten' | 'Konvertieren' | 'Optimieren & Sicherheit'

export interface Tool {
  slug: string
  title: string
  description: string
  icon: LucideIcon
  category: Category
  /** tailwind colour classes for the icon tile */
  tone: string
  popular?: boolean
  /** which inputs the tool accepts when continuing from a result */
  input: 'pdf' | 'pdfs' | 'images'
  keywords?: string
  load: () => Promise<{ default: ComponentType }>
}

const t = (x: Tool) => x

export const TOOLS: Tool[] = [
  t({ slug: 'merge', title: 'PDF zusammenfügen', description: 'Mehrere PDFs zu einem Dokument kombinieren und Reihenfolge festlegen.', icon: Combine, category: 'Organisieren', tone: 'bg-indigo-100 text-indigo-600', popular: true, input: 'pdfs', keywords: 'merge kombinieren verbinden', load: () => import('./Merge') }),
  t({ slug: 'split', title: 'PDF teilen', description: 'In einzelne Seiten, feste Abschnitte oder eigene Bereiche aufteilen.', icon: Scissors, category: 'Organisieren', tone: 'bg-rose-100 text-rose-600', popular: true, input: 'pdf', keywords: 'split trennen aufteilen', load: () => import('./Split') }),
  t({ slug: 'organize', title: 'Seiten organisieren', description: 'Seiten per Drag & Drop sortieren, drehen, löschen, duplizieren oder leere Seiten einfügen.', icon: LayoutGrid, category: 'Organisieren', tone: 'bg-violet-100 text-violet-600', popular: true, input: 'pdfs', keywords: 'sortieren reihenfolge anordnen', load: () => import('./Organize') }),
  t({ slug: 'rotate', title: 'PDF drehen', description: 'Einzelne oder alle Seiten dauerhaft drehen.', icon: RotateCw, category: 'Organisieren', tone: 'bg-sky-100 text-sky-600', input: 'pdf', keywords: 'rotate', load: () => import('./Rotate') }),
  t({ slug: 'delete', title: 'Seiten löschen', description: 'Unerwünschte Seiten auswählen und entfernen.', icon: Trash2, category: 'Organisieren', tone: 'bg-red-100 text-red-600', input: 'pdf', keywords: 'entfernen remove', load: () => import('./DeletePages') }),
  t({ slug: 'extract', title: 'Seiten extrahieren', description: 'Ausgewählte Seiten als neue PDF speichern.', icon: FileOutput, category: 'Organisieren', tone: 'bg-teal-100 text-teal-600', input: 'pdf', keywords: 'auswählen herausziehen', load: () => import('./Extract') }),
  t({ slug: 'alternate', title: 'Abwechselnd mischen', description: 'Seiten zweier PDFs abwechselnd kombinieren – ideal für beidseitige Scans.', icon: Shuffle, category: 'Organisieren', tone: 'bg-fuchsia-100 text-fuchsia-600', input: 'pdfs', keywords: 'duplex scan mix', load: () => import('./Alternate') }),

  t({ slug: 'edit', title: 'PDF bearbeiten', description: 'Text, Bilder, Formen, Markierungen und Weißfläche direkt auf die Seiten setzen.', icon: PenLine, category: 'Bearbeiten', tone: 'bg-amber-100 text-amber-600', popular: true, input: 'pdf', keywords: 'editor text hinzufügen schwärzen', load: () => import('./Edit') }),
  t({ slug: 'sign', title: 'PDF unterschreiben', description: 'Unterschrift zeichnen, tippen oder als Bild einfügen und platzieren.', icon: Signature, category: 'Bearbeiten', tone: 'bg-emerald-100 text-emerald-600', popular: true, input: 'pdf', keywords: 'signatur unterschrift sign', load: () => import('./Sign') }),
  t({ slug: 'fill-form', title: 'Formular ausfüllen', description: 'PDF-Formularfelder ausfüllen und optional fixieren.', icon: TextCursorInput, category: 'Bearbeiten', tone: 'bg-lime-100 text-lime-700', input: 'pdf', keywords: 'formular felder acroform', load: () => import('./FillForm') }),
  t({ slug: 'watermark', title: 'Wasserzeichen', description: 'Text-Wasserzeichen wie „VERTRAULICH“ auf alle Seiten stempeln.', icon: Stamp, category: 'Bearbeiten', tone: 'bg-cyan-100 text-cyan-600', input: 'pdf', keywords: 'stempel entwurf vertraulich', load: () => import('./Watermark') }),
  t({ slug: 'page-numbers', title: 'Seitenzahlen', description: 'Seitenzahlen mit eigenem Format und Position hinzufügen.', icon: Hash, category: 'Bearbeiten', tone: 'bg-orange-100 text-orange-600', input: 'pdf', keywords: 'nummerierung paginierung bates', load: () => import('./PageNumbers') }),
  t({ slug: 'crop', title: 'PDF zuschneiden', description: 'Ränder entfernen – per Maus aufziehen oder exakt in mm angeben.', icon: Crop, category: 'Bearbeiten', tone: 'bg-pink-100 text-pink-600', input: 'pdf', keywords: 'ränder beschneiden crop', load: () => import('./CropTool') }),
  t({ slug: 'resize', title: 'Seitengröße ändern', description: 'Alle Seiten auf A4, A3, A5, Letter oder Legal skalieren.', icon: Maximize2, category: 'Bearbeiten', tone: 'bg-blue-100 text-blue-600', input: 'pdf', keywords: 'skalieren format a4', load: () => import('./Resize') }),
  t({ slug: 'metadata', title: 'Metadaten bearbeiten', description: 'Titel, Autor, Thema und Stichwörter ändern.', icon: Info, category: 'Bearbeiten', tone: 'bg-slate-200 text-slate-700', input: 'pdf', keywords: 'eigenschaften titel autor', load: () => import('./Metadata') }),

  t({ slug: 'images-to-pdf', title: 'Bilder zu PDF', description: 'JPG, PNG & Co. zu einer PDF zusammenführen.', icon: ImagePlus, category: 'Konvertieren', tone: 'bg-yellow-100 text-yellow-700', popular: true, input: 'images', keywords: 'jpg png foto konvertieren', load: () => import('./ImagesToPdf') }),
  t({ slug: 'pdf-to-images', title: 'PDF zu Bild', description: 'Seiten als hochwertige JPG- oder PNG-Bilder exportieren.', icon: FileImage, category: 'Konvertieren', tone: 'bg-green-100 text-green-600', input: 'pdf', keywords: 'jpg png export', load: () => import('./PdfToImages') }),
  t({ slug: 'pdf-to-text', title: 'PDF zu Text', description: 'Den enthaltenen Text als .txt extrahieren.', icon: FileText, category: 'Konvertieren', tone: 'bg-stone-200 text-stone-700', input: 'pdf', keywords: 'txt extrahieren kopieren', load: () => import('./PdfToText') }),

  t({ slug: 'compress', title: 'PDF komprimieren', description: 'Dateigröße verringern – verlustfrei oder mit starker Bildkompression.', icon: Minimize2, category: 'Optimieren & Sicherheit', tone: 'bg-purple-100 text-purple-600', popular: true, input: 'pdf', keywords: 'verkleinern größe reduzieren', load: () => import('./Compress') }),
  t({ slug: 'grayscale', title: 'Graustufen', description: 'Farbige PDFs in Schwarz-Weiß umwandeln.', icon: Contrast, category: 'Optimieren & Sicherheit', tone: 'bg-zinc-200 text-zinc-700', input: 'pdf', keywords: 'schwarz weiß grau drucken', load: () => import('./Grayscale') }),
  t({ slug: 'protect', title: 'PDF schützen', description: 'Mit Passwort verschlüsseln (AES-256) und Rechte einschränken.', icon: Lock, category: 'Optimieren & Sicherheit', tone: 'bg-red-100 text-red-600', input: 'pdf', keywords: 'passwort verschlüsseln sicher', load: () => import('./Protect') }),
  t({ slug: 'unlock', title: 'PDF entsperren', description: 'Passwortschutz und Einschränkungen entfernen (Passwort erforderlich).', icon: LockOpen, category: 'Optimieren & Sicherheit', tone: 'bg-emerald-100 text-emerald-600', input: 'pdf', keywords: 'passwort entfernen entschlüsseln', load: () => import('./Unlock') }),
]

export const CATEGORIES: Category[] = ['Organisieren', 'Bearbeiten', 'Konvertieren', 'Optimieren & Sicherheit']

export const toolBySlug = (slug: string) => TOOLS.find((x) => x.slug === slug)
