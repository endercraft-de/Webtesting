import JSZip from 'jszip'

export interface OutFile {
  name: string
  bytes: Uint8Array
  type: string
}

let idCounter = 0
export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

export async function readFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`
  return `${(n / 1024 / 1024).toFixed(2).replace('.', ',')} MB`
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

export function isPdf(f: File) {
  return f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
}

export function isImage(f: File) {
  return f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name)
}

export function toBlob(f: OutFile): Blob {
  return new Blob([f.bytes as BlobPart], { type: f.type })
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function downloadFile(f: OutFile) {
  downloadBlob(toBlob(f), f.name)
}

export async function zipFiles(files: OutFile[]): Promise<Blob> {
  const zip = new JSZip()
  const used = new Set<string>()
  for (const f of files) {
    let n = f.name
    let i = 2
    while (used.has(n)) n = f.name.replace(/(\.[^.]+)?$/, (ext) => `-${i++}${ext}`)
    used.add(n)
    zip.file(n, f.bytes)
  }
  return zip.generateAsync({ type: 'blob' })
}

export const pdfOut = (name: string, bytes: Uint8Array): OutFile => ({ name, bytes, type: 'application/pdf' })
