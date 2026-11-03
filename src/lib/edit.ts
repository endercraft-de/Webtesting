import { degrees, type PDFFont, type PDFImage } from '@cantoo/pdf-lib'
import { displayToPdf, pageFrame } from './geometry'
import { FONTS, hexToRgb, load, sanitize, save, type FontName } from './ops'

interface Base {
  id: string
  page: number
  /** display coordinates in PDF points, origin top-left */
  x: number
  y: number
  w: number
  h: number
}

export type EditElement =
  | (Base & { type: 'text'; text: string; fontSize: number; color: string; font: FontName })
  | (Base & { type: 'rect'; color: string; opacity: number; border?: string })
  | (Base & { type: 'image'; url: string; bytes: Uint8Array; kind: 'png' | 'jpg' })

export const LINE_HEIGHT = 1.2
/** baseline offset of the first line, relative to the font size (Helvetica/Arial metrics with line-height 1.2) */
export const BASELINE = 0.947

export async function applyEdits(bytes: Uint8Array, elements: EditElement[]): Promise<Uint8Array> {
  const doc = await load(bytes)
  const fonts = new Map<FontName, PDFFont>()
  const images = new Map<string, PDFImage>()
  for (const el of elements) {
    const page = doc.getPage(el.page)
    const f = pageFrame(page)
    const rotate = degrees(f.rotation)
    const bl = displayToPdf(f, el.x, el.y + el.h)
    if (el.type === 'rect') {
      page.drawRectangle({
        x: bl.x,
        y: bl.y,
        width: el.w,
        height: el.h,
        rotate,
        color: hexToRgb(el.color),
        opacity: el.opacity,
        borderColor: el.border ? hexToRgb(el.border) : undefined,
        borderWidth: el.border ? 1 : 0,
      })
    } else if (el.type === 'image') {
      let img = images.get(el.id)
      if (!img) {
        img = el.kind === 'png' ? await doc.embedPng(el.bytes) : await doc.embedJpg(el.bytes)
        images.set(el.id, img)
      }
      page.drawImage(img, { x: bl.x, y: bl.y, width: el.w, height: el.h, rotate })
    } else {
      let font = fonts.get(el.font)
      if (!font) {
        font = await doc.embedFont(FONTS[el.font])
        fonts.set(el.font, font)
      }
      const lines = sanitize(font, el.text).split('\n')
      lines.forEach((line, i) => {
        const p = displayToPdf(f, el.x + 2, el.y + 2 + (BASELINE + LINE_HEIGHT * i) * el.fontSize)
        page.drawText(line, { x: p.x, y: p.y, size: el.fontSize, font, color: hexToRgb(el.color), rotate })
      })
    }
  }
  return save(doc)
}
