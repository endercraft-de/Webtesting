import { RotateCcw, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { PageCard, gridCls } from '../components/PageGrid'
import { SinglePdfTool } from '../components/SinglePdfTool'
import { Button, IconButton } from '../components/ui'
import { baseName, pdfOut } from '../lib/files'
import { assemble } from '../lib/ops'
import { toolBySlug } from './registry'

const tool = toolBySlug('rotate')!

export default function Rotate() {
  const [rot, setRot] = useState<number[]>([])
  const turn = (i: number, d: number) => setRot((r) => r.map((v, k) => (k === i ? v + d : v)))
  const all = (d: number) => setRot((r) => r.map((v) => v + d))

  return (
    <SinglePdfTool
      tool={tool}
      actionLabel="PDF drehen"
      onLoaded={(p) => setRot(new Array(p.numPages).fill(0))}
      validate={() => (rot.every((r) => r % 360 === 0) ? 'Klicke auf Seiten, um sie zu drehen.' : null)}
      toolbar={() => (
        <>
          <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => all(-90)}>
            Alle links
          </Button>
          <Button size="sm" icon={<RotateCw className="size-4" />} onClick={() => all(90)}>
            Alle rechts
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRot((r) => r.map(() => 0))}>
            Zurücksetzen
          </Button>
          <span className="ml-auto hidden text-xs text-slate-400 sm:block">Tipp: Seite anklicken = 90° im Uhrzeigersinn</span>
        </>
      )}
      main={(pdf) => (
        <div className={gridCls}>
          {Array.from({ length: pdf.numPages }, (_, i) => (
            <PageCard
              key={i}
              doc={pdf.doc}
              index={i}
              rotation={rot[i] ?? 0}
              onClick={() => turn(i, 90)}
              footer={
                <div className="absolute right-2 top-2 flex gap-0.5 rounded-lg bg-white/95 p-0.5 opacity-100 shadow-sm ring-1 ring-slate-200 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <IconButton title="Nach links drehen" onClick={() => turn(i, -90)}>
                    <RotateCcw className="size-4" />
                  </IconButton>
                  <IconButton title="Nach rechts drehen" onClick={() => turn(i, 90)}>
                    <RotateCw className="size-4" />
                  </IconButton>
                </div>
              }
            />
          ))}
        </div>
      )}
      run={async (pdf) => {
        const bytes = await assemble(
          [pdf.bytes],
          rot.map((r, index) => ({ kind: 'page', src: 0, index, rotate: ((r % 360) + 360) % 360 })),
        )
        return [pdfOut(`${baseName(pdf.name)}-gedreht.pdf`, bytes)]
      }}
    />
  )
}
