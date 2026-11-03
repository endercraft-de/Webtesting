import type { PDFPage } from '@cantoo/pdf-lib'

export interface PageFrame {
  /** visible box (crop box) in PDF user space */
  box: { x: number; y: number; width: number; height: number }
  /** page rotation, normalised to 0/90/180/270 */
  rotation: number
  /** width/height as displayed (after rotation) */
  width: number
  height: number
}

export function normRotation(r: number) {
  return (((Math.round(r / 90) * 90) % 360) + 360) % 360
}

export function pageFrame(page: PDFPage): PageFrame {
  const box = page.getCropBox()
  const rotation = normRotation(page.getRotation().angle)
  const swap = rotation === 90 || rotation === 270
  return { box, rotation, width: swap ? box.height : box.width, height: swap ? box.width : box.height }
}

/**
 * Converts a point in display coordinates (origin top-left, y downward, in points)
 * into PDF user space, taking crop box and /Rotate into account.
 */
export function displayToPdf(f: PageFrame, dx: number, dy: number): { x: number; y: number } {
  const { x, y, width, height } = f.box
  switch (f.rotation) {
    case 90:
      return { x: x + dy, y: y + dx }
    case 180:
      return { x: x + width - dx, y: y + dy }
    case 270:
      return { x: x + width - dy, y: y + height - dx }
    default:
      return { x: x + dx, y: y + height - dy }
  }
}
