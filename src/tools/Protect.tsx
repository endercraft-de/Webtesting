import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Field, Section, TextInput, Toggle } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { protect } from '../lib/ops'
import { toolBySlug } from './registry'

const tool = toolBySlug('protect')!

export default function Protect() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [owner, setOwner] = useState('')
  const [show, setShow] = useState(false)
  const [perm, setPerm] = useState({ printing: true, copying: true, modifying: false, annotating: true })
  const type = show ? 'text' : 'password'

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="PDF verschlüsseln"
      validate={() => (pw.length < 1 ? 'Bitte ein Passwort festlegen.' : pw !== pw2 ? 'Die Passwörter stimmen nicht überein.' : null)}
      main={() => (
        <div className="mx-auto max-w-md space-y-4 py-2">
          <Field label="Passwort zum Öffnen">
            <div className="relative">
              <TextInput type={type} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className="pr-10" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 flex items-center px-1 text-slate-400 hover:text-slate-700" title="Anzeigen">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Field label="Passwort wiederholen">
            <TextInput type={type} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Besitzer-Passwort (optional)" hint="Erlaubt das Aufheben der Einschränkungen. Leer = gleiches Passwort.">
            <TextInput type={type} value={owner} onChange={(e) => setOwner(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
      )}
      side={() => (
        <Section title="Berechtigungen">
          <Toggle checked={perm.printing} onChange={(v) => setPerm((p) => ({ ...p, printing: v }))} label="Drucken erlauben" />
          <Toggle checked={perm.copying} onChange={(v) => setPerm((p) => ({ ...p, copying: v }))} label="Text kopieren erlauben" />
          <Toggle checked={perm.modifying} onChange={(v) => setPerm((p) => ({ ...p, modifying: v }))} label="Ändern erlauben" />
          <Toggle checked={perm.annotating} onChange={(v) => setPerm((p) => ({ ...p, annotating: v }))} label="Kommentare & Formulare erlauben" />
          <p className="text-xs text-slate-500">Verschlüsselung: AES-256</p>
        </Section>
      )}
      run={async (pdf) => [pdfOut(`${baseName(pdf.name)}-geschuetzt.pdf`, await protect(pdf.bytes, { userPassword: pw, ownerPassword: owner, ...perm }))]}
    />
  )
}
