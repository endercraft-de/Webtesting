import { PDFDocument } from '@cantoo/pdf-lib'
import { canvasToBlob, openPdf, renderPage } from './pdfjs'

export type Progress = (done: number, total: number) => void

export interface RasterOptions {
  dpi: number
  quality: number // 0..1
  grayscale?: boolean
}

function toGray(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    d[i] = d[i + 1] = d[i + 2] = g
  }
  ctx.putImageData(img, 0, 0)
}

/** Re-renders each page as JPEG and rebuilds the document (strong compression, text is no longer selectable). */
export async function rasterizePdf(bytes: Uint8Array, o: RasterOptions, onProgress?: Progress): Promise<Uint8Array> {
  const src = await openPdf(bytes)
  const out = await PDFDocument.create()
  out.setProducer('PDFwerk')
  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    const canvas = await renderPage(page, o.dpi / 72)
    if (o.grayscale) toGray(canvas)
    const blob = await canvasToBlob(canvas, 'image/jpeg', o.quality)
    const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()))
    const p = out.addPage([vp.width, vp.height])
    p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height })
    page.cleanup()
    canvas.width = canvas.height = 0
    onProgress?.(i, src.numPages)
  }
  await src.destroy()
  return out.save({ useObjectStreams: true })
}

/** Lossless optimisation: rewrite with object streams and drop unused objects. */
export async function optimizePdf(bytes: Uint8Array): Promise<Uint8Array> {
  const d = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  return d.save({ useObjectStreams: true })
}

export async function pdfToImages(
  bytes: Uint8Array,
  pages: number[],
  o: { dpi: number; format: 'png' | 'jpg'; quality: number },
  onProgress?: Progress,
): Promise<{ index: number; bytes: Uint8Array }[]> {
  const doc = await openPdf(bytes)
  const out: { index: number; bytes: Uint8Array }[] = []
  for (let k = 0; k < pages.length; k++) {
    const page = await doc.getPage(pages[k] + 1)
    const canvas = await renderPage(page, o.dpi / 72, { background: o.format === 'png' ? '#fff' : '#fff' })
    const blob = await canvasToBlob(canvas, o.format === 'png' ? 'image/png' : 'image/jpeg', o.quality)
    out.push({ index: pages[k], bytes: new Uint8Array(await blob.arrayBuffer()) })
    page.cleanup()
    canvas.width = canvas.height = 0
    onProgress?.(k + 1, pages.length)
  }
  await doc.destroy()
  return out
}

export async function pdfToText(bytes: Uint8Array, onProgress?: Progress): Promise<string> {
  const doc = await openPdf(bytes)
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    let line = ''
    const lines: string[] = []
    for (const it of tc.items) {
      if (!('str' in it)) continue
      line += it.str
      if (it.hasEOL) {
        lines.push(line)
        line = ''
      }
    }
    if (line) lines.push(line)
    parts.push(`--- Seite ${i} ---\n${lines.join('\n')}`)
    onProgress?.(i, doc.numPages)
  }
  await doc.destroy()
  return parts.join('\n\n')
}

/** Normalises any browser-readable image into PNG or JPG bytes that pdf-lib can embed. */
export async function loadImage(file: File): Promise<{ bytes: Uint8Array; kind: 'png' | 'jpg'; width: number; height: number; url: string }> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  await img.decode()
  const width = img.naturalWidth
  const height = img.naturalHeight
  if (/jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name)) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: 'jpg', width, height, url }
  }
  if (file.type === 'image/png') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: 'png', width, height, url }
  }
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  c.getContext('2d')!.drawImage(img, 0, 0)
  const blob = await canvasToBlob(c, 'image/png')
  return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: 'png', width, height, url }
}
