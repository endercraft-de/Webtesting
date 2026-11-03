import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PDFFont,
  PageSizes,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
} from '@cantoo/pdf-lib'
import { displayToPdf, normRotation, pageFrame } from './geometry'

export { PDFDocument }

export const load = (bytes: Uint8Array, password?: string) =>
  PDFDocument.load(bytes, { ignoreEncryption: !password, password, updateMetadata: false })

export const save = (doc: PDFDocument) => doc.save({ useObjectStreams: true })

/** Decrypts a PDF when it is encrypted (returns the original bytes otherwise). Throws on a wrong password. */
export async function ensureDecrypted(bytes: Uint8Array, password?: string): Promise<Uint8Array> {
  const probe = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  if (!probe.isEncrypted) return bytes
  const doc = await PDFDocument.load(bytes, { password: password ?? '', updateMetadata: false })
  return doc.save()
}

export async function pageCount(bytes: Uint8Array) {
  return (await load(bytes)).getPageCount()
}

// ---------------------------------------------------------------- assembling

export type PageRef =
  | { kind: 'page'; src: number; index: number; rotate?: number }
  | { kind: 'blank'; width: number; height: number }

/** Builds a new document from page references over multiple source documents. */
export async function assemble(sources: Uint8Array[], refs: PageRef[]): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  const docs = await Promise.all(sources.map((b) => load(b)))
  // copy per source in one go (keeps shared resources together)
  const needed = docs.map(() => new Set<number>())
  refs.forEach((r) => r.kind === 'page' && needed[r.src].add(r.index))
  const copied = await Promise.all(
    docs.map(async (d, i) => {
      const idx = [...needed[i]]
      const pages = idx.length ? await out.copyPages(d, idx) : []
      return new Map(idx.map((p, k) => [p, pages[k]]))
    }),
  )
  const usedOnce = new Set<string>()
  for (const r of refs) {
    if (r.kind === 'blank') {
      out.addPage([r.width, r.height])
      continue
    }
    const key = `${r.src}:${r.index}`
    // the same page may be used twice -> copy again
    let page = copied[r.src].get(r.index)!
    if (usedOnce.has(key)) [page] = await out.copyPages(docs[r.src], [r.index])
    usedOnce.add(key)
    out.addPage(page)
    if (r.rotate) page.setRotation(degrees(normRotation(page.getRotation().angle + r.rotate)))
  }
  if (docs[0]) copyInfo(docs[0], out)
  return save(out)
}

function copyInfo(from: PDFDocument, to: PDFDocument) {
  try {
    const t = from.getTitle()
    if (t) to.setTitle(t)
    const a = from.getAuthor()
    if (a) to.setAuthor(a)
  } catch {
    /* ignore broken metadata */
  }
  to.setProducer('PDFwerk')
}

export async function merge(sources: Uint8Array[], opts: { padOdd?: boolean } = {}): Promise<Uint8Array> {
  const refs: PageRef[] = []
  for (let s = 0; s < sources.length; s++) {
    const d = await load(sources[s])
    const n = d.getPageCount()
    for (let i = 0; i < n; i++) refs.push({ kind: 'page', src: s, index: i })
    if (opts.padOdd && n % 2 === 1 && s < sources.length - 1) {
      const { width, height } = d.getPage(n - 1).getSize()
      refs.push({ kind: 'blank', width, height })
    }
  }
  return assemble(sources, refs)
}

export async function split(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const out: Uint8Array[] = []
  for (const g of groups) out.push(await assemble([bytes], g.map((index) => ({ kind: 'page', src: 0, index }))))
  return out
}

// ---------------------------------------------------------------- text helpers

export function sanitize(font: PDFFont, text: string): string {
  const set = new Set(font.getCharacterSet())
  return [...text]
    .map((c) => {
      if (c === '\n') return c
      const cp = c.codePointAt(0)!
      if (set.has(cp)) return c
      const map: Record<string, string> = { '„': '"', '“': '"', '”': '"', '‚': "'", '‘': "'", '’': "'", '–': '-', '—': '-', '…': '...' }
      return map[c] && [...map[c]].every((x) => set.has(x.codePointAt(0)!)) ? map[c] : '?'
    })
    .join('')
}

export function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

export const FONTS = {
  Helvetica: StandardFonts.Helvetica,
  'Helvetica Fett': StandardFonts.HelveticaBold,
  Times: StandardFonts.TimesRoman,
  'Times Fett': StandardFonts.TimesRomanBold,
  Courier: StandardFonts.Courier,
} as const
export type FontName = keyof typeof FONTS

// ---------------------------------------------------------------- watermark

export interface WatermarkOptions {
  text: string
  fontSize: number
  color: string
  opacity: number
  angle: number
  font: FontName
  pages: number[]
}

export async function watermark(bytes: Uint8Array, o: WatermarkOptions) {
  const doc = await load(bytes)
  const font = await doc.embedFont(FONTS[o.font])
  const text = sanitize(font, o.text)
  const tw = font.widthOfTextAtSize(text, o.fontSize)
  const th = font.heightAtSize(o.fontSize, { descender: false })
  for (const i of o.pages) {
    const page = doc.getPage(i)
    const f = pageFrame(page)
    // place centre of text at centre of displayed page
    const a = (o.angle * Math.PI) / 180
    const cx = f.width / 2
    const cy = f.height / 2
    // origin (bottom-left of text) in display coords, rotating counter clockwise by angle
    const ox = cx - (Math.cos(a) * tw) / 2 + (Math.sin(a) * th) / 2
    const oy = cy + (Math.sin(a) * tw) / 2 + (Math.cos(a) * th) / 2
    const p = displayToPdf(f, ox, oy)
    page.drawText(text, {
      x: p.x,
      y: p.y,
      size: o.fontSize,
      font,
      color: hexToRgb(o.color),
      opacity: o.opacity,
      rotate: degrees(o.angle + f.rotation),
    })
  }
  return save(doc)
}

// ---------------------------------------------------------------- page numbers

export type Pos = 'tl' | 'tc' | 'tr' | 'bl' | 'bc' | 'br'

export interface NumberOptions {
  format: string
  position: Pos
  start: number
  fontSize: number
  margin: number
  color: string
  font: FontName
  pages: number[]
}

export async function addPageNumbers(bytes: Uint8Array, o: NumberOptions) {
  const doc = await load(bytes)
  const font = await doc.embedFont(FONTS[o.font])
  const total = o.pages.length + o.start - 1
  o.pages.forEach((i, k) => {
    const page = doc.getPage(i)
    const f = pageFrame(page)
    const label = sanitize(
      font,
      o.format.replaceAll('{n}', String(k + o.start)).replaceAll('{total}', String(total)).replaceAll('{p}', String(i + 1)),
    )
    const w = font.widthOfTextAtSize(label, o.fontSize)
    const h = font.heightAtSize(o.fontSize, { descender: false })
    const col = o.position[1]
    const dx = col === 'l' ? o.margin : col === 'r' ? f.width - o.margin - w : (f.width - w) / 2
    const dy = o.position[0] === 't' ? o.margin + h : f.height - o.margin
    const p = displayToPdf(f, dx, dy)
    page.drawText(label, { x: p.x, y: p.y, size: o.fontSize, font, color: hexToRgb(o.color), rotate: degrees(f.rotation) })
  })
  return save(doc)
}

// ---------------------------------------------------------------- crop & resize

/** margins in points, in display orientation */
export async function crop(bytes: Uint8Array, m: { top: number; right: number; bottom: number; left: number }, pages: number[]) {
  const doc = await load(bytes)
  for (const i of pages) {
    const page = doc.getPage(i)
    const f = pageFrame(page)
    const w = f.width - m.left - m.right
    const h = f.height - m.top - m.bottom
    if (w < 10 || h < 10) throw new Error(`Die Ränder sind zu groß für Seite ${i + 1}.`)
    const a = displayToPdf(f, m.left, m.top)
    const b = displayToPdf(f, f.width - m.right, f.height - m.bottom)
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    const bw = Math.abs(a.x - b.x)
    const bh = Math.abs(a.y - b.y)
    page.setCropBox(x, y, bw, bh)
    page.setMediaBox(x, y, bw, bh)
  }
  return save(doc)
}

export const PAGE_SIZES: Record<string, [number, number]> = {
  A3: PageSizes.A3,
  A4: PageSizes.A4,
  A5: PageSizes.A5,
  Letter: PageSizes.Letter,
  Legal: PageSizes.Legal,
}

export async function resize(bytes: Uint8Array, size: [number, number], margin: number) {
  const src = await load(bytes)
  const out = await PDFDocument.create()
  copyInfo(src, out)
  const n = src.getPageCount()
  for (let i = 0; i < n; i++) {
    const sp = src.getPage(i)
    const f = pageFrame(sp)
    const landscape = f.width > f.height
    const [W, H] = landscape ? [Math.max(...size), Math.min(...size)] : [Math.min(...size), Math.max(...size)]
    const emb = await out.embedPage(sp, { left: f.box.x, bottom: f.box.y, right: f.box.x + f.box.width, top: f.box.y + f.box.height })
    const page = out.addPage([W, H])
    const scale = Math.min((W - 2 * margin) / f.width, (H - 2 * margin) / f.height)
    const dw = f.width * scale
    const dh = f.height * scale
    const left = (W - dw) / 2
    const bottom = (H - dh) / 2
    // emulate the source rotation when drawing the embedded (unrotated) page
    const bw = f.box.width * scale
    const bh = f.box.height * scale
    const pos: Record<number, [number, number]> = {
      0: [left, bottom],
      90: [left, bottom + dh],
      180: [left + dw, bottom + dh],
      270: [left + dw, bottom],
    }
    const [x, y] = pos[f.rotation]
    page.drawPage(emb, { x, y, width: bw, height: bh, rotate: degrees(-f.rotation) })
  }
  return save(out)
}

// ---------------------------------------------------------------- metadata

export interface Meta {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
  producer: string
}

export async function readMeta(bytes: Uint8Array): Promise<Meta> {
  const d = await load(bytes)
  return {
    title: d.getTitle() ?? '',
    author: d.getAuthor() ?? '',
    subject: d.getSubject() ?? '',
    keywords: d.getKeywords() ?? '',
    creator: d.getCreator() ?? '',
    producer: d.getProducer() ?? '',
  }
}

export async function writeMeta(bytes: Uint8Array, m: Meta) {
  const d = await load(bytes)
  d.setTitle(m.title)
  d.setAuthor(m.author)
  d.setSubject(m.subject)
  d.setKeywords(m.keywords.split(',').map((s) => s.trim()).filter(Boolean))
  d.setCreator(m.creator)
  d.setProducer(m.producer)
  d.setModificationDate(new Date())
  return save(d)
}

// ---------------------------------------------------------------- security

export interface ProtectOptions {
  userPassword: string
  ownerPassword: string
  printing: boolean
  copying: boolean
  modifying: boolean
  annotating: boolean
}

export async function protect(bytes: Uint8Array, o: ProtectOptions) {
  const d = await load(bytes)
  d.encrypt({
    userPassword: o.userPassword,
    ownerPassword: o.ownerPassword || o.userPassword,
    permissions: {
      printing: o.printing ? 'highResolution' : false,
      copying: o.copying,
      modifying: o.modifying,
      annotating: o.annotating,
      fillingForms: o.annotating,
      contentAccessibility: true,
      documentAssembly: o.modifying,
    },
  })
  return d.save({ useObjectStreams: false })
}

export async function unlock(bytes: Uint8Array, password: string) {
  return ensureDecrypted(bytes, password)
}

// ---------------------------------------------------------------- forms

export type FieldInfo =
  | { name: string; type: 'text'; value: string; multiline: boolean }
  | { name: string; type: 'checkbox'; value: boolean }
  | { name: string; type: 'select'; value: string; options: string[] }

export async function readForm(bytes: Uint8Array): Promise<FieldInfo[]> {
  const d = await load(bytes)
  const out: FieldInfo[] = []
  for (const f of d.getForm().getFields()) {
    const name = f.getName()
    try {
      if (f instanceof PDFTextField) out.push({ name, type: 'text', value: f.getText() ?? '', multiline: f.isMultiline() })
      else if (f instanceof PDFCheckBox) out.push({ name, type: 'checkbox', value: f.isChecked() })
      else if (f instanceof PDFDropdown || f instanceof PDFOptionList)
        out.push({ name, type: 'select', value: f.getSelected()[0] ?? '', options: f.getOptions() })
      else if (f instanceof PDFRadioGroup) out.push({ name, type: 'select', value: f.getSelected() ?? '', options: f.getOptions() })
    } catch {
      /* unsupported field */
    }
  }
  return out
}

export async function fillForm(bytes: Uint8Array, values: Record<string, string | boolean>, flatten: boolean) {
  const d = await load(bytes)
  const form = d.getForm()
  for (const [name, v] of Object.entries(values)) {
    const f = form.getFieldMaybe(name)
    if (!f) continue
    if (f instanceof PDFTextField) f.setText(String(v))
    else if (f instanceof PDFCheckBox) (v ? f.check() : f.uncheck())
    else if (f instanceof PDFDropdown || f instanceof PDFOptionList) v ? f.select(String(v)) : f.clear()
    else if (f instanceof PDFRadioGroup) v ? f.select(String(v)) : f.clear()
  }
  const font = await d.embedFont(StandardFonts.Helvetica)
  form.updateFieldAppearances(font)
  if (flatten) form.flatten()
  return save(d)
}

// ---------------------------------------------------------------- images -> pdf

export interface ImageItem {
  bytes: Uint8Array
  kind: 'png' | 'jpg'
  width: number
  height: number
}

export async function imagesToPdf(images: ImageItem[], o: { size: 'fit' | keyof typeof PAGE_SIZES; margin: number; orientation: 'auto' | 'portrait' | 'landscape' }) {
  const doc = await PDFDocument.create()
  doc.setProducer('PDFwerk')
  for (const im of images) {
    const img = im.kind === 'png' ? await doc.embedPng(im.bytes) : await doc.embedJpg(im.bytes)
    if (o.size === 'fit') {
      const page = doc.addPage([im.width + 2 * o.margin, im.height + 2 * o.margin])
      page.drawImage(img, { x: o.margin, y: o.margin, width: im.width, height: im.height })
      continue
    }
    const [a, b] = PAGE_SIZES[o.size]
    const land = o.orientation === 'landscape' || (o.orientation === 'auto' && im.width > im.height)
    const [W, H] = land ? [Math.max(a, b), Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)]
    const page = doc.addPage([W, H])
    const s = Math.min((W - 2 * o.margin) / im.width, (H - 2 * o.margin) / im.height)
    const w = im.width * s
    const h = im.height * s
    page.drawImage(img, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h })
  }
  return save(doc)
}
