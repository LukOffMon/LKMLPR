import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { sfx } from '../core/audio';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

type Variant = 'primary' | 'ghost' | 'soft' | 'danger' | 'outline';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  accent?: string;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'soft', size = 'md', accent, icon, className, children, onClick, style, ...rest },
  ref,
) {
  const base = 'relative inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 select-none disabled:opacity-40 disabled:pointer-events-none active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-[15px]' };
  const variants: Record<Variant, string> = {
    primary: 'text-ink-950 font-semibold shadow-[0_0_24px_-6px_var(--acc)] hover:brightness-110',
    soft: 'bg-white/[.06] text-ink-100 hover:bg-white/[.1] border border-white/[.06]',
    ghost: 'text-ink-200 hover:bg-white/[.06]',
    outline: 'border border-white/15 text-ink-100 hover:border-white/30 hover:bg-white/[.04]',
    danger: 'bg-rose-500/15 text-rose-200 border border-rose-400/30 hover:bg-rose-500/25',
  };
  const acc = accent ?? '#a78bfa';
  return (
    <button
      ref={ref}
      className={cx(base, sizes[size], variants[variant], className)}
      style={{ ...(variant === 'primary' ? { background: acc } : {}), ['--acc' as string]: acc, ...style }}
      onClick={(e) => {
        sfx.click();
        onClick?.(e);
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export function Glass({ className, children, accent, onClick, as = 'div' }: { className?: string; children: ReactNode; accent?: string; onClick?: () => void; as?: 'div' | 'button' }) {
  const Tag = as;
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'relative rounded-2xl border border-white/[.07] bg-ink-850/70 backdrop-blur-xl shadow-glow text-left',
        onClick && 'transition hover:border-white/15 hover:bg-ink-800/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        className,
      )}
      style={accent ? ({ ['--acc' as string]: accent } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}

export function Pill({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', className)}
      style={{ color: color ?? '#c7cde0', background: `${color ?? '#c7cde0'}1f`, boxShadow: `inset 0 0 0 1px ${color ?? '#c7cde0'}33` }}
    >
      {children}
    </span>
  );
}

export function Bar({ value, color = '#a78bfa', className, height = 6 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-white/[.06]', className)} style={{ height }}>
      <motion.div className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}88` }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
    </div>
  );
}

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-ink-400">{label}</div>
      <div className="font-display text-2xl font-semibold tabular-nums" style={{ color: color ?? '#e7eaf3' }}>
        {value}
      </div>
      {sub && <div className="text-xs text-ink-400">{sub}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-white/15 bg-white/[.06] px-1.5 py-0.5 font-mono text-[11px] text-ink-200">{children}</kbd>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cx('max-h-[88vh] w-full overflow-auto rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-300 hover:bg-white/10" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-ink-400">{eyebrow}</div>}
        <h2 className="font-display text-lg font-semibold text-ink-100" style={{ textWrap: 'balance' } as React.CSSProperties}>
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

// ───────── hooks ─────────
export function useKey(handler: (e: KeyboardEvent) => void, deps: unknown[] = []) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && !['Enter', 'Escape'].includes(e.key)) return;
      ref.current(e);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Cuenta atrás en segundos; llama a onEnd al llegar a 0. */
export function useCountdown(seconds: number, running: boolean, onEnd: () => void, resetKey: unknown = 0) {
  const [left, setLeft] = useState(seconds);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const keyRef = useRef(resetKey);
  const leftRef = useRef(left);
  leftRef.current = left;
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let base = leftRef.current;
    if (keyRef.current !== resetKey || base <= 0) {
      keyRef.current = resetKey;
      base = seconds;
    }
    setLeft(base);
    const id = setInterval(() => {
      const l = Math.max(0, base - (performance.now() - start) / 1000);
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        endRef.current();
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, resetKey]);
  return left;
}

export function TimerRing({ left, total, color = '#a78bfa', size = 44 }: { left: number; total: number; color?: string; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`${Math.ceil(left)} segundos`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={3} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={3} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-xs tabular-nums text-ink-100">{Math.ceil(left)}</div>
    </div>
  );
}

/** Cabecera compacta dentro de un juego: progreso, tiempo, etc. */
export function GameHud({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-300">{children}</div>;
}

export function Feedback({ state }: { state: 'ok' | 'bad' | null }) {
  if (!state) return null;
  return (
    <motion.div
      key={Math.random()}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cx('pointer-events-none text-sm font-semibold', state === 'ok' ? 'text-emerald-300' : 'text-rose-300')}
    >
      {state === 'ok' ? 'Correcto' : 'Incorrecto'}
    </motion.div>
  );
}

export const inputCls = 'h-11 w-full rounded-xl border border-white/10 bg-ink-900/80 px-3.5 text-ink-100 placeholder:text-ink-500 outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10';
