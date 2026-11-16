import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useStore } from '../core/store';
import { DOMAIN, DOMAINS } from '../core/domains';
import { GAMES } from '../games';
import type { Domain } from '../core/types';
import { Glass, Pill, cx, inputCls } from '../components/ui';
import { useNav } from './nav';
import { GameIcon } from './icons';
import { norm } from '../core/rng';

export function Library() {
  const { play } = useNav();
  const sessions = useStore((s) => s.sessions);
  const levels = useStore((s) => s.levels);
  const [dom, setDom] = useState<Domain | 'all'>('all');
  const [q, setQ] = useState('');
  const stats = useMemo(() => {
    const m: Record<string, { n: number; best: number | null }> = {};
    for (const g of GAMES) {
      const xs = sessions.filter((s) => s.gameId === g.id);
      m[g.id] = { n: xs.length, best: xs.length ? (g.higherBetter ? Math.max(...xs.map((x) => x.score)) : Math.min(...xs.map((x) => x.score))) : null };
    }
    return m;
  }, [sessions]);
  const list = GAMES.filter((g) => (dom === 'all' || g.domain === dom) && (!q || norm(g.name + ' ' + g.tagline).includes(norm(q))));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Biblioteca</div>
          <h1 className="font-display text-3xl font-semibold">{GAMES.length} módulos de entrenamiento</h1>
        </div>
        <label className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input id="lib-search" className={cx(inputCls, 'pl-9')} placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button onClick={() => setDom('all')} className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-sm', dom === 'all' ? 'border-white/40 bg-white/10 text-ink-100' : 'border-white/10 text-ink-400 hover:text-ink-200')}>Todos</button>
        {DOMAINS.map((d) => (
          <button key={d.id} onClick={() => setDom(d.id)} className="shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition" style={{ borderColor: dom === d.id ? d.color : 'rgba(255,255,255,.1)', background: dom === d.id ? `${d.color}22` : 'transparent', color: dom === d.id ? d.color : '#9aa3c0' }}>
            {d.name}
          </button>
        ))}
      </div>
      {DOMAINS.filter((d) => list.some((g) => g.domain === d.id)).map((d) => (
        <section key={d.id} className="mb-7">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="font-display text-lg font-semibold" style={{ color: d.color }}>{d.name}</h2>
            <p className="text-sm text-ink-400">{d.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.filter((g) => g.domain === d.id).map((g, i) => {
              const st = stats[g.id];
              return (
                <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <Glass as="button" onClick={() => play(g.id)} className="group h-full w-full p-4">
                    <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100" style={{ boxShadow: `inset 0 0 0 1px ${DOMAIN[g.domain].color}55, 0 0 40px -18px ${DOMAIN[g.domain].color}` }} />
                    <div className="flex items-start gap-3">
                      <GameIcon id={g.id} color={d.color} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold text-ink-100">{g.name}</span>
                          {g.tool && <Pill color={d.color}>Herramienta</Pill>}
                        </div>
                        <p className="mt-0.5 text-sm text-ink-400">{g.tagline}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 border-t border-white/[.05] pt-3 text-xs text-ink-400">
                      <span>Nivel <b className="text-ink-200">{levels[g.id] ?? 1}</b></span>
                      <span>Sesiones <b className="text-ink-200">{st.n}</b></span>
                      <span>Mejor <b className="text-ink-200">{st.best === null ? '—' : `${Number.isInteger(st.best) ? st.best : st.best.toFixed(1)} ${g.scoreUnit}`}</b></span>
                    </div>
                  </Glass>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
      {!list.length && <p className="text-ink-400">No hay ejercicios que coincidan.</p>}
    </div>
  );
}
