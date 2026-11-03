import { useEffect, useRef, useState } from 'react'
import { readFile } from './files'
import { LoadCancelled, usePdfLoader, type LoadedPdf } from './loader'
import { takeHandoff } from './store'

export function useMultiPdf(onAdded?: (added: LoadedPdf[], all: LoadedPdf[]) => void) {
  const loader = usePdfLoader()
  const [pdfs, setPdfs] = useState<LoadedPdf[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cb = useRef(onAdded)
  cb.current = onAdded
  const ref = useRef(pdfs)
  ref.current = pdfs

  const addBytes = async (list: { name: string; bytes: Uint8Array }[]) => {
    setLoading(true)
    setError(null)
    const added: LoadedPdf[] = []
    for (const f of list) {
      try {
        added.push(await loader(f.name, f.bytes))
      } catch (e) {
        if (!(e instanceof LoadCancelled)) setError((e as Error).message)
      }
    }
    const all = [...ref.current, ...added]
    setPdfs(all)
    ref.current = all
    cb.current?.(added, all)
    setLoading(false)
  }

  const add = async (files: File[]) => addBytes(await Promise.all(files.map(async (f) => ({ name: f.name, bytes: await readFile(f) }))))

  useEffect(() => {
    const h = takeHandoff()
    if (h?.length) addBytes(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remove = (id: string) => setPdfs((p) => p.filter((x) => x.id !== id))
  const reset = () => {
    pdfs.forEach((p) => p.doc.destroy())
    setPdfs([])
    setError(null)
  }
  return { pdfs, setPdfs, add, remove, reset, loading, error }
}
