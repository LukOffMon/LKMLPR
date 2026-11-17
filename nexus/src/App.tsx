import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { BarChart3, BrainCircuit, CalendarCheck, LayoutGrid, Network, Settings as Cog, Gauge, Volume2, VolumeX } from 'lucide-react';
import { update, useStore } from './core/store';
import { levelFromXp, liveStreak, rankFor } from './core/progress';
import { NeuralBackground } from './components/NeuralBackground';
import { GameRunner } from './components/GameRunner';
import { Nav, type View } from './pages/nav';
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import { Routine } from './pages/Routine';
import { Analytics } from './pages/Analytics';
import { Skills } from './pages/Skills';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { GAME } from './games';
import { cx } from './components/ui';

const TABS: { v: View; label: string; Icon: typeof Gauge }[] = [
  { v: 'inicio', label: 'Centro de mando', Icon: Gauge },
  { v: 'rutina', label: 'Rutina', Icon: CalendarCheck },
  { v: 'biblioteca', label: 'Biblioteca', Icon: LayoutGrid },
  { v: 'analiticas', label: 'Analíticas', Icon: BarChart3 },
  { v: 'habilidades', label: 'Habilidades', Icon: Network },
  { v: 'ajustes', label: 'Ajustes', Icon: Cog },
];

const readHash = (): View => {
  const h = decodeURIComponent(window.location.hash.slice(1));
  if (TABS.some((t) => t.v === h)) return h as View;
  if (h.startsWith('juego-') && GAME[h.slice(6)]) return h as View;
  return 'inicio';
};

function useReducedMotion(pref: 'system' | 'on' | 'off') {
  const [sys, setSys] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      const h = () => setSys(m.matches);
      m.addEventListener('change', h);
      return () => m.removeEventListener('change', h);
    } catch {
      return;
    }
  }, []);
  return pref === 'on' || (pref === 'system' && sys);
}

export default function App() {
  const onboarded = useStore((s) => s.profile.onboarded);
  const settings = useStore((s) => s.settings);
  const xp = useStore((s) => s.xp);
  const streak = useStore(liveStreak);
  const [view, setView] = useState<View>(readHash);
  const [focus, setFocus] = useState(false);
  const reduced = useReducedMotion(settings.reduceMotion);

  useEffect(() => {
    const h = () => setView(readHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const go = useCallback((v: View) => {
    setView(v);
    try {
      if (window.location.hash.slice(1) !== v) window.history.pushState(null, '', `#${v}`);
    } catch {
      /* sin historial disponible */
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);
  const ctx = useMemo(() => ({ view, go, play: (id: string) => go(`juego-${id}`), setFocus }), [view, go]);
  const lv = levelFromXp(xp);
  const rank = rankFor(lv.level);
  const inGame = view.startsWith('juego-');
  const hideChrome = focus || !onboarded;

  let page: React.ReactNode;
  if (!onboarded) page = <Onboarding />;
  else if (inGame) page = <GameRunner key={view} gameId={view.slice(6)} setFocus={setFocus} onExit={() => go('biblioteca')} />;
  else if (view === 'rutina') page = <Routine />;
  else if (view === 'biblioteca') page = <Library />;
  else if (view === 'analiticas') page = <Analytics />;
  else if (view === 'habilidades') page = <Skills />;
  else if (view === 'ajustes') page = <Settings />;
  else page = <Dashboard />;

  const activeTab = inGame ? 'biblioteca' : view;

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <Nav.Provider value={ctx}>
        <div className="min-h-full">
          <NeuralBackground reduced={reduced} dim={focus} />
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,.14),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,.08),transparent_50%)]" />

          {/* barra lateral (escritorio) */}
          <AnimatePresence>
            {!hideChrome && (
              <motion.aside initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/[.06] bg-ink-950/70 p-4 backdrop-blur-xl lg:flex" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))' }}>
                <button onClick={() => go('inicio')} className="mb-8 flex items-center gap-2.5 px-2 pt-2 text-left">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-cyan-300 text-ink-950"><BrainCircuit size={20} /></div>
                  <div>
                    <div className="font-display text-lg font-bold tracking-[.18em]">NEXUS</div>
                    <div className="-mt-0.5 text-[10px] uppercase tracking-[.16em] text-ink-400">Gimnasio mental</div>
                  </div>
                </button>
                <nav className="flex flex-col gap-1" aria-label="Principal">
                  {TABS.map(({ v, label, Icon }) => (
                    <button key={v} onClick={() => go(v)} className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', activeTab === v ? 'bg-white/[.08] text-ink-100' : 'text-ink-400 hover:bg-white/[.04] hover:text-ink-200')} aria-current={activeTab === v ? 'page' : undefined}>
                      <Icon size={18} className={activeTab === v ? 'text-violet-300' : ''} />
                      {label}
                    </button>
                  ))}
                </nav>
                <div className="mt-auto rounded-2xl border border-white/[.06] bg-white/[.03] p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-semibold text-ink-100">{rank.name}</span>
                    <span className="text-ink-400">Nv. {lv.level}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${lv.progress * 100}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                    <span>{streak} {streak === 1 ? 'día' : 'días'} de racha</span>
                    <button onClick={() => update((d) => void (d.settings.sound = !d.settings.sound))} aria-label={settings.sound ? 'Silenciar' : 'Activar sonido'} className="rounded p-1 hover:bg-white/10">
                      {settings.sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* cabecera móvil */}
          {!hideChrome && (
            <header className="sticky z-20 flex items-center justify-between border-b border-white/[.06] bg-ink-950/75 py-3 backdrop-blur-xl lg:hidden" style={{ top: 'env(safe-area-inset-top, 0px)', paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
              <button onClick={() => go('inicio')} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-cyan-300 text-ink-950"><BrainCircuit size={18} /></div>
                <span className="font-display font-bold tracking-[.18em]">NEXUS</span>
              </button>
              <div className="flex items-center gap-3 text-xs text-ink-300">
                <span>{rank.name} · Nv. {lv.level}</span>
                <button onClick={() => update((d) => void (d.settings.sound = !d.settings.sound))} aria-label={settings.sound ? 'Silenciar' : 'Activar sonido'} className="rounded p-1 hover:bg-white/10">
                  {settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
            </header>
          )}

          <main className={cx('relative z-10 pb-28 pt-5 lg:pb-10 lg:pt-8', !hideChrome && 'lg:pl-60')}>
            <div className="mx-auto max-w-6xl" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
              <AnimatePresence mode="wait">
                <motion.div key={onboarded ? (inGame ? 'game' : view) : 'onb'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                  {page}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* barra inferior (móvil) */}
          {!hideChrome && (
            <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-white/[.06] bg-ink-950/85 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }} aria-label="Principal">
              {TABS.map(({ v, label, Icon }) => (
                <button key={v} onClick={() => go(v)} className={cx('flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium', activeTab === v ? 'text-violet-300' : 'text-ink-400')} aria-current={activeTab === v ? 'page' : undefined}>
                  <Icon size={20} />
                  <span className="max-w-full truncate px-0.5">{label.split(' ')[0]}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </Nav.Provider>
    </MotionConfig>
  );
}
