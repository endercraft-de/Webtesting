import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type { PDFDocumentProxy, PDFPageProxy }

export class PasswordRequiredError extends Error {
  constructor(public incorrect: boolean) {
    super(incorrect ? 'Falsches Passwort.' : 'Diese PDF ist passwortgeschützt.')
  }
}

/** Opens a document with pdf.js. Always passes a copy, because pdf.js transfers the buffer to its worker. */
export async function openPdf(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  try {
    return await pdfjs.getDocument({ data: bytes.slice(), password }).promise
  } catch (e: unknown) {
    const err = e as { name?: string; code?: number }
    if (err?.name === 'PasswordException') throw new PasswordRequiredError(err.code === 2)
    throw e
  }
}

export async function renderPage(
  page: PDFPageProxy,
  scale: number,
  opts: { canvas?: HTMLCanvasElement; background?: string; rotation?: number } = {},
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale, rotation: (page.rotate + (opts.rotation ?? 0)) % 360 })
  const canvas = opts.canvas ?? document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = opts.background ?? '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  return canvas
}

/** Renders a page so that it fits into a box of `maxPx` (longest side) and returns a blob URL. */
export async function renderThumbnail(doc: PDFDocumentProxy, pageIndex: number, maxPx = 320): Promise<string> {
  const page = await doc.getPage(pageIndex + 1)
  const vp = page.getViewport({ scale: 1 })
  const scale = (maxPx / Math.max(vp.width, vp.height)) * Math.min(2, window.devicePixelRatio || 1)
  const canvas = await renderPage(page, scale)
  page.cleanup()
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.85))
  return URL.createObjectURL(blob)
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Rendern fehlgeschlagen'))), type, quality))
}
