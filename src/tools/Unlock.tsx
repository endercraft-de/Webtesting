import { SinglePdfTool } from '../components/SinglePdfTool'
import { Alert } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { toolBySlug } from './registry'

const tool = toolBySlug('unlock')!

export default function Unlock() {
  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="Schutz entfernen"
      uploadNote="Du wirst beim Öffnen nach dem Passwort gefragt. Ohne das Passwort ist kein Entsperren möglich."
      validate={(pdf) => (pdf.wasEncrypted ? null : 'Diese PDF ist nicht verschlüsselt – es gibt nichts zu entsperren.')}
      side={(pdf) => pdf.wasEncrypted && <Alert tone="success">Passwort korrekt. Die Datei kann jetzt ohne Schutz gespeichert werden.</Alert>}
      run={async (pdf) => [pdfOut(`${baseName(pdf.name)}-entsperrt.pdf`, pdf.bytes)]}
    />
  )
}
