import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';
import { cx, useKey } from '../components/ui';
import type { RawResult } from '../core/types';

/** Garantiza que onFinish se llame una sola vez. */
export function useFinish(onFinish: (r: RawResult) => void) {
  const done = useRef(false);
  return (r: RawResult) => {
    if (done.current) return;
    done.current = true;
    onFinish(r);
  };
}

/** Teclado numérico táctil + soporte de teclado físico. */
export function NumPad({ value, onChange, onSubmit, maxLen = 20, allowMinus, allowDot, color = '#a78bfa', disabled }: { value: string; onChange: (v: string) => void; onSubmit: () => void; maxLen?: number; allowMinus?: boolean; allowDot?: boolean; color?: string; disabled?: boolean }) {
  useKey((e) => {
    if (disabled) return;
    if (/^[0-9]$/.test(e.key) && value.length < maxLen) onChange(value + e.key);
    else if (e.key === 'Backspace') onChange(value.slice(0, -1));
    else if (e.key === 'Enter') onSubmit();
    else if (allowMinus && e.key === '-' && !value.startsWith('-')) onChange('-' + value);
    else if (allowDot && (e.key === '.' || e.key === ',') && !value.includes('.')) onChange(value + '.');
  }, [value, disabled]);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowMinus ? '±' : allowDot ? '.' : '', '0', '⌫'];
  return (
    <div className="mx-auto grid w-full max-w-[300px] grid-cols-3 gap-2">
      {keys.map((k, i) =>
        k === '' ? (
          <div key={i} />
        ) : (
          <button
            key={i}
            disabled={disabled}
            onClick={() => {
              if (k === '⌫') onChange(value.slice(0, -1));
              else if (k === '±') onChange(value.startsWith('-') ? value.slice(1) : '-' + value);
              else if (k === '.') !value.includes('.') && onChange(value + '.');
              else if (value.length < maxLen) onChange(value + k);
            }}
            className="flex h-14 items-center justify-center rounded-xl border border-white/[.07] bg-white/[.05] font-mono text-xl text-ink-100 transition hover:bg-white/[.1] active:scale-95 disabled:opacity-40"
            aria-label={k === '⌫' ? 'Borrar' : k}
          >
            {k === '⌫' ? <Delete size={20} /> : k}
          </button>
        ),
      )}
      <button
        disabled={disabled}
        onClick={onSubmit}
        className="col-span-3 h-12 rounded-xl font-semibold text-ink-950 transition active:scale-[.98] disabled:opacity-40"
        style={{ background: color }}
      >
        Confirmar
      </button>
    </div>
  );
}

/** Botones de opción múltiple con atajos 1–9. */
export function Choices<T>({ options, onPick, render, cols = 2, disabled, state, keyHints = true }: { options: T[]; onPick: (o: T, i: number) => void; render: (o: T, i: number) => ReactNode; cols?: number; disabled?: boolean; state?: (o: T, i: number) => 'ok' | 'bad' | 'dim' | null; keyHints?: boolean }) {
  useKey((e) => {
    if (disabled) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= options.length) onPick(options[n - 1], n - 1);
  }, [options, disabled]);
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {options.map((o, i) => {
        const st = state?.(o, i);
        return (
          <motion.button
            key={i}
            whileTap={{ scale: 0.97 }}
            disabled={disabled}
            onClick={() => onPick(o, i)}
            className={cx(
              'relative flex min-h-[52px] items-center justify-center rounded-xl border p-3 text-center text-ink-100 transition',
              st === 'ok' ? 'border-emerald-400/70 bg-emerald-400/15' : st === 'bad' ? 'border-rose-400/70 bg-rose-400/15' : st === 'dim' ? 'border-white/5 opacity-40' : 'border-white/[.08] bg-white/[.04] hover:border-white/20 hover:bg-white/[.08]',
            )}
          >
            {keyHints && <span className="absolute left-2 top-1.5 font-mono text-[10px] text-ink-500">{i + 1}</span>}
            {render(o, i)}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Cuenta atrás 3-2-1 antes de empezar. */
export function GetReady({ onDone, label = 'Prepárate' }: { onDone: () => void; label?: string }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setN(n - 1), 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2">
      <div className="text-xs uppercase tracking-[.2em] text-ink-400">{label}</div>
      <motion.div key={n} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-6xl font-bold text-ink-100">
        {n || '¡Ya!'}
      </motion.div>
    </div>
  );
}

export function Progress({ i, n, color }: { i: number; n: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${(i / n) * 100}%`, background: color }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-ink-400">
        {Math.min(i + 1, n)}/{n}
      </span>
    </div>
  );
}

export const C = { mem: '#a78bfa', att: '#22d3ee', spd: '#fbbf24', rea: '#34d399', spa: '#60a5fa', lan: '#f472b6', cal: '#a3e635', cre: '#fb923c', met: '#cbd5e1' };
