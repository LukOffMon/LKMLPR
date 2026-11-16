import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function PageHeader({
  kicker,
  title,
  sub,
  right,
}: {
  kicker: string
  title: string
  sub?: string
  right?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="label mb-2 flex items-center gap-2">
          <span className="inline-block h-px w-6 bg-gold-500/60" />
          {kicker}
        </div>
        <h1 className="text-2xl font-semibold text-ink-100 sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm text-ink-300">{sub}</p>}
      </div>
      {right}
    </header>
  )
}

export function Card({
  children,
  className,
  gold,
  onClick,
}: {
  children: ReactNode
  className?: string
  gold?: boolean
  onClick?: () => void
}) {
  return (
    <div onClick={onClick} className={cn(gold ? 'card-gold' : 'card', 'p-4 sm:p-5', className)}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-ink-100">{children}</h2>
      {right}
    </div>
  )
}

export function Progress({
  value,
  max = 100,
  color = 'gold',
  className,
}: {
  value: number
  max?: number
  color?: 'gold' | 'money'
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-700/70', className)}>
      <motion.div
        className={cn(
          'h-full rounded-full',
          color === 'gold' ? 'bg-gradient-to-r from-gold-600 to-gold-400' : 'bg-gradient-to-r from-money-600 to-money-400',
        )}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />
    </div>
  )
}

export function Dots({ value, max = 5, label }: { value: number; max?: number; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-ink-300">{label}</span>
      <div className="flex gap-1" aria-label={`${label}: ${value} de ${max}`}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={cn('h-1.5 w-4 rounded-full', i < value ? 'bg-gold-500' : 'bg-ink-600')} />
        ))}
      </div>
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'money' | 'alert' | 'blue' }) {
  const tones = {
    neutral: 'border-ink-600 bg-ink-800 text-ink-200',
    gold: 'border-gold-600/50 bg-gold-500/10 text-gold-300',
    money: 'border-money-600/50 bg-money-500/10 text-money-300',
    alert: 'border-alert-500/40 bg-alert-500/10 text-alert-400',
    blue: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  }
  return <span className={cn('chip', tones[tone])}>{children}</span>
}

export function CheckRow({
  checked,
  onToggle,
  children,
  detalle,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
  detalle?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'group flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-ink-800/70',
        checked && 'opacity-70',
      )}
    >
      <span
        className={cn(
          'relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
          checked ? 'border-money-500 bg-money-500' : 'border-ink-500 group-hover:border-gold-500',
        )}
      >
        <AnimatePresence>
          {checked && (
            <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <Check className="h-3.5 w-3.5 text-ink-950" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
        {checked && (
          <motion.span
            className="absolute inset-0 rounded-md border-2 border-money-400"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </span>
      <span className="min-w-0">
        <span className={cn('block text-sm text-ink-100', checked && 'line-through decoration-ink-500')}>{children}</span>
        {detalle && <span className="mt-0.5 block text-xs text-ink-400">{detalle}</span>}
      </span>
    </button>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('card relative max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-300 hover:bg-ink-700" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-ink-700 bg-ink-900/80 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === o.id ? 'text-ink-950' : 'text-ink-300 hover:text-ink-100',
          )}
        >
          {value === o.id && <motion.span layoutId={`seg-${options.map((x) => x.id).join('')}`} className="absolute inset-0 rounded-lg bg-gold-500" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-600 px-6 py-10 text-center">
      <div className="mb-3 text-gold-500">{icon}</div>
      <p className="font-medium text-ink-100">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-400">{children}</div>}
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'gold' | 'money' }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={cn('mt-1 font-display text-2xl font-semibold tabular-nums', tone === 'gold' ? 'text-gold-400' : tone === 'money' ? 'text-money-400' : 'text-ink-100')}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-ink-400">{sub}</div>}
    </div>
  )
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-warn-400/30 bg-warn-400/5 px-3.5 py-2.5 text-xs leading-relaxed text-warn-400/90">{children}</div>
  )
}
