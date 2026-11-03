import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        variant === 'primary' && 'bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700',
        variant === 'secondary' && 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        variant === 'danger' && 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50',
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ className, title, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      title={title}
      aria-label={title}
      className={cx(
        'inline-flex size-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-800 ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none transition'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        className={cx(inputCls, suffix && 'pr-12')}
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        onBlur={(e) => {
          let v = Number(e.target.value)
          if (!Number.isFinite(v)) v = min ?? 0
          if (min !== undefined) v = Math.max(min, v)
          if (max !== undefined) v = Math.min(max, v)
          onChange(v)
        }}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">{suffix}</span>}
    </div>
  )
}

export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select className={cx(inputCls, 'appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8')} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; title?: string }[]
  className?: string
}) {
  return (
    <div className={cx('flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1', className)} role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 min-w-fit rounded-lg px-3 py-1.5 text-sm font-medium transition',
            o.value === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  )
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const swatches = ['#000000', '#475569', '#dc2626', '#2563eb', '#16a34a', '#4f46e5']
  return (
    <div className="flex items-center gap-1.5">
      {swatches.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onChange(c)}
          className={cx('size-7 rounded-full ring-offset-2 transition', value.toLowerCase() === c ? 'ring-2 ring-brand-500' : 'ring-1 ring-slate-200')}
          style={{ background: c }}
        />
      ))}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0" title="Eigene Farbe" />
    </div>
  )
}

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' | 'warn' | 'success' }) {
  return (
    <div
      className={cx(
        'rounded-xl px-4 py-3 text-sm',
        tone === 'error' && 'bg-red-50 text-red-700 ring-1 ring-red-100',
        tone === 'info' && 'bg-brand-50 text-brand-700 ring-1 ring-brand-100',
        tone === 'warn' && 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
        tone === 'success' && 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
      )}
    >
      {children}
    </div>
  )
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>}
      {children}
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}
