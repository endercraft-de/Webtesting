import { useCallback } from 'react'
import { usePasswordPrompt } from '../components/PasswordDialog'
import { uid } from './files'
import { ensureDecrypted } from './ops'
import { openPdf, PasswordRequiredError, type PDFDocumentProxy } from './pdfjs'

export interface LoadedPdf {
  id: string
  name: string
  bytes: Uint8Array
  size: number
  doc: PDFDocumentProxy
  numPages: number
  wasEncrypted: boolean
}

export class LoadCancelled extends Error {}

/** Returns a function that loads a PDF, asks for a password if necessary and returns decrypted bytes. */
export function usePdfLoader() {
  const ask = usePasswordPrompt()
  return useCallback(
    async (name: string, input: Uint8Array): Promise<LoadedPdf> => {
      let password: string | undefined
      let incorrect = false
      let doc: PDFDocumentProxy | null = null
      for (;;) {
        try {
          doc = await openPdf(input, password)
          break
        } catch (e) {
          if (!(e instanceof PasswordRequiredError)) throw new Error(`„${name}“ konnte nicht gelesen werden. Ist es eine gültige PDF?`)
          incorrect = e.incorrect
          const p = await ask(name, incorrect)
          if (p === null) throw new LoadCancelled('abgebrochen')
          password = p
        }
      }
      let bytes = input
      let wasEncrypted = false
      try {
        const dec = await ensureDecrypted(input, password)
        if (dec !== input) {
          wasEncrypted = true
          bytes = dec
          await doc.destroy()
          doc = await openPdf(bytes)
        }
      } catch {
        /* keep original bytes; pdf.js can still render it */
      }
      return { id: uid('pdf'), name, bytes, size: input.byteLength, doc, numPages: doc.numPages, wasEncrypted }
    },
    [ask],
  )
}
