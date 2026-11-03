import { useState } from 'react'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Alert, Field, Select, TextInput, Toggle, inputCls } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { fillForm, readForm, type FieldInfo } from '../lib/ops'
import { toolBySlug } from './registry'

const tool = toolBySlug('fill-form')!

export default function FillForm() {
  const [fields, setFields] = useState<FieldInfo[] | null>(null)
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [flatten, setFlatten] = useState(false)
  const set = (k: string, v: string | boolean) => setValues((x) => ({ ...x, [k]: v }))

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="Formular speichern"
      onLoaded={async (p) => {
        setFields(null)
        const f = await readForm(p.bytes).catch(() => [])
        setFields(f)
        setValues(Object.fromEntries(f.map((x) => [x.name, x.value])))
      }}
      validate={() => (fields && !fields.length ? 'Diese PDF enthält keine ausfüllbaren Formularfelder. Nutze stattdessen „PDF bearbeiten“.' : null)}
      main={() =>
        !fields ? (
          <p className="p-6 text-sm text-slate-500">Formularfelder werden gelesen …</p>
        ) : !fields.length ? (
          <div className="p-4">
            <Alert tone="warn">Keine Formularfelder gefunden.</Alert>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-4 py-2 sm:grid-cols-2">
            {fields.map((f) =>
              f.type === 'checkbox' ? (
                <div key={f.name} className="flex items-center sm:col-span-2">
                  <Toggle checked={!!values[f.name]} onChange={(v) => set(f.name, v)} label={f.name} />
                </div>
              ) : f.type === 'select' ? (
                <Field key={f.name} label={f.name}>
                  <Select value={String(values[f.name] ?? '')} onChange={(v) => set(f.name, v)} options={[{ value: '', label: '– keine Auswahl –' }, ...f.options.map((o) => ({ value: o, label: o }))]} />
                </Field>
              ) : f.multiline ? (
                <Field key={f.name} label={f.name} className="sm:col-span-2">
                  <textarea className={`${inputCls} h-24 py-2`} value={String(values[f.name] ?? '')} onChange={(e) => set(f.name, e.target.value)} />
                </Field>
              ) : (
                <Field key={f.name} label={f.name}>
                  <TextInput value={String(values[f.name] ?? '')} onChange={(e) => set(f.name, e.target.value)} />
                </Field>
              ),
            )}
          </div>
        )
      }
      side={() => fields && fields.length > 0 && <Toggle checked={flatten} onChange={setFlatten} label="Formular fixieren" hint="Felder werden in normalen Inhalt umgewandelt und sind nicht mehr editierbar." />}
      run={async (pdf) => [pdfOut(`${baseName(pdf.name)}-ausgefuellt.pdf`, await fillForm(pdf.bytes, values, flatten))]}
    />
  )
}
