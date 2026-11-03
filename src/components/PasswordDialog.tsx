import { Lock } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Button, TextInput } from './ui'

type Ask = (fileName: string, incorrect: boolean) => Promise<string | null>
const Ctx = createContext<Ask>(async () => null)

export const usePasswordPrompt = () => useContext(Ctx)

export function PasswordProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ name: string; incorrect: boolean } | null>(null)
  const [value, setValue] = useState('')
  const resolver = useRef<((v: string | null) => void) | null>(null)

  const ask = useCallback<Ask>((name, incorrect) => {
    setValue('')
    setState({ name, incorrect })
    return new Promise((res) => (resolver.current = res))
  }, [])

  const close = (v: string | null) => {
    resolver.current?.(v)
    resolver.current = null
    setState(null)
  }

  return (
    <Ctx.Provider value={ask}>
      {children}
      {state && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => close(null)}>
          <form
            className="animate-pop w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              close(value)
            }}
          >
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Lock className="size-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Passwort erforderlich</h2>
            <p className="mt-1 break-all text-sm text-slate-500">„{state.name}“ ist geschützt. Bitte gib das Passwort zum Öffnen ein.</p>
            <TextInput autoFocus type="password" className="mt-4" placeholder="Passwort" value={value} onChange={(e) => setValue(e.target.value)} />
            {state.incorrect && <p className="mt-2 text-sm text-red-600">Das Passwort ist falsch. Bitte erneut versuchen.</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => close(null)}>
                Abbrechen
              </Button>
              <Button type="submit" variant="primary">
                Öffnen
              </Button>
            </div>
          </form>
        </div>
      )}
    </Ctx.Provider>
  )
}
