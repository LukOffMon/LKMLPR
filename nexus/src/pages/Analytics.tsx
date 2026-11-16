import { useMemo, useState } from 'react';
import { useStore } from '../core/store';
import { DOMAIN, DOMAINS } from '../core/domains';
import { DOMAIN_OF, GAME, GAMES } from '../games';
import { domainProfile } from '../core/progress';
import { dayKey, mean } from '../core/rng';
import { LineChart } from '../components/charts';
import { CalibrationChart } from '../games/metacog';
import { Glass, SectionTitle, Stat, cx } from '../components/ui';
import { GameIcon } from './icons';
import { useNav } from './nav';

function Heatmap({ activity }: { activity: Record<string, number> }) {
  const weeks = 16;
  const today = new Date();
  const days = [...Array(weeks * 7)].map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (weeks * 7 - 1 - i));
    return { k: dayKey(d), m: activity[dayKey(d)] ?? 0, future: false };
  });
  const lvl = (m: number) => (m === 0 ? 0 : m < 5 ? 1 : m < 12 ? 2 : m < 20 ? 3 : 4);
  const cols = ['rgba(255,255,255,.05)', '#3b2f6e', '#5b45a8', '#8b6fe6', '#c4b5fd'];
  return (
    <div className="overflow-x-auto">
      <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
        {days.map((d) => (
          <div key={d.k} title={`${d.k}: ${Math.round(d.m)} min`} className="h-3.5 w-3.5 rounded-[3px]" style={{ background: cols[lvl(d.m)] }} />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-ink-500">
        Menos {cols.map((c) => <span key={c} className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />)} Más
      </div>
    </div>
  );
}

export function Analytics() {
  const s = useStore((x) => x);
  const { play } = useNav();
  const played = useMemo(() => GAMES.filter((g) => s.sessions.some((x) => x.gameId === g.id)), [s.sessions]);
  const [sel, setSel] = useState<string | null>(null);
  const gid = sel ?? played[0]?.id ?? null;
  const prof = useMemo(() => domainProfile(s, DOMAIN_OF), [s]);
  const totalMin = Math.round(Object.values(s.activity).reduce((a, b) => a + b, 0));
  const accAvg = s.sessions.length ? Math.round(mean(s.sessions.slice(-50).map((x) => x.accuracy)) * 100) : null;
  const rtSessions = s.sessions.filter((x) => x.gameId === 'reaction');
  const preds = s.sessions.filter((x) => x.predicted !== undefined);
  const predBias = preds.length ? Math.round(mean(preds.map((p) => p.predicted! - p.accuracy)) * 100) : null;

  const gs = gid ? s.sessions.filter((x) => x.gameId === gid) : [];
  const g = gid ? GAME[gid] : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Analíticas</div>
        <h1 className="font-display text-3xl font-semibold">Tu evolución</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Glass className="p-4"><Stat label="Sesiones" value={s.sessions.length} /></Glass>
        <Glass className="p-4"><Stat label="Tiempo total" value={`${totalMin} min`} /></Glass>
        <Glass className="p-4"><Stat label="Precisión media" value={accAvg === null ? '—' : `${accAvg} %`} sub="últimas 50 sesiones" /></Glass>
        <Glass className="p-4"><Stat label="TR mediano" value={rtSessions.length ? `${Math.round(rtSessions[rtSessions.length - 1].score)} ms` : '—'} sub={rtSessions.length ? `mejor ${Math.min(...rtSessions.map((x) => x.score))} ms` : 'juega Tiempo de reacción'} /></Glass>
      </div>

      <Glass className="p-5">
        <SectionTitle eyebrow="Constancia" title="Actividad de las últimas 16 semanas" />
        <Heatmap activity={s.activity} />
      </Glass>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Glass className="p-5">
          <SectionTitle eyebrow="Por dominio" title="Índices actuales" />
          <div className="space-y-2.5">
            {DOMAINS.map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="w-28 text-sm text-ink-300">{d.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full" style={{ width: `${prof[d.id] ?? 0}%`, background: d.color }} />
                </div>
                <span className="w-8 text-right text-sm tabular-nums text-ink-300">{prof[d.id] ?? '—'}</span>
              </div>
            ))}
          </div>
        </Glass>
        <Glass className="p-5">
          <SectionTitle eyebrow="Historial por juego" title={g ? g.name : 'Aún no hay sesiones'} />
          {played.length > 0 && (
            <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {played.map((p) => (
                <button key={p.id} onClick={() => setSel(p.id)} className={cx('shrink-0 rounded-full border px-3 py-1 text-xs', p.id === gid ? 'text-ink-100' : 'border-white/10 text-ink-400')} style={p.id === gid ? { borderColor: DOMAIN[p.domain].color, background: `${DOMAIN[p.domain].color}22` } : undefined}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {g && gs.length > 0 ? (
            <>
              <div className="mb-1 text-xs text-ink-400">Puntuación ({g.scoreUnit}{g.higherBetter ? '' : ', menor es mejor'})</div>
              <LineChart data={gs.slice(-40).map((x, i) => ({ x: i, y: x.score }))} color={DOMAIN[g.domain].color} />
              <div className="mb-1 mt-3 text-xs text-ink-400">Precisión (%) y nivel</div>
              <LineChart data={gs.slice(-40).map((x, i) => ({ x: i, y: Math.round(x.accuracy * 100) }))} color="#e7eaf3" height={90} yMax={100} />
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="Sesiones" value={gs.length} />
                <Stat label="Mejor" value={g.higherBetter ? Math.max(...gs.map((x) => x.score)) : Math.min(...gs.map((x) => x.score))} />
                <Stat label="Media" value={Math.round(mean(gs.map((x) => x.score)) * 10) / 10} />
                <Stat label="Nivel actual" value={s.levels[g.id] ?? 1} />
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-400">Juega cualquier módulo y aquí verás tus curvas de progreso.</p>
          )}
        </Glass>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Glass className="p-5">
          <SectionTitle eyebrow="Metacognición" title="Curva de calibración" />
          {s.calibration.length >= 5 ? (
            <div className="flex flex-wrap items-center gap-5">
              <CalibrationChart points={s.calibration} />
              <div className="text-sm text-ink-300">
                <p>{s.calibration.length} juicios de confianza.</p>
                <p className="mt-1">Precisión real: {Math.round((s.calibration.filter((c) => c.correct).length / s.calibration.length) * 100)} % · confianza media {Math.round(mean(s.calibration.map((c) => c.conf)) * 100)} %.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-400">
              Juega <button className="text-met underline" onClick={() => play('calibration')}>Calibración de confianza</button> para ver si tu seguridad coincide con tu precisión.
            </p>
          )}
          {predBias !== null && <p className="mt-3 text-sm text-ink-300">En {preds.length} sesiones predijiste tu precisión con un sesgo medio de <b>{predBias > 0 ? '+' : ''}{predBias} puntos</b> ({predBias > 5 ? 'exceso de confianza' : predBias < -5 ? 'infravaloración' : 'bien calibrado'}).</p>}
        </Glass>
        <Glass className="p-5">
          <SectionTitle eyebrow="Mejores marcas" title="Récords personales" />
          <div className="max-h-80 space-y-1.5 overflow-auto pr-1">
            {played.map((p) => {
              const xs = s.sessions.filter((x) => x.gameId === p.id);
              const best = p.higherBetter ? Math.max(...xs.map((x) => x.score)) : Math.min(...xs.map((x) => x.score));
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[.03]">
                  <GameIcon id={p.id} color={DOMAIN[p.domain].color} size={16} />
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="font-mono text-sm tabular-nums text-ink-200">{Number.isInteger(best) ? best : best.toFixed(1)} <span className="text-ink-500">{p.scoreUnit}</span></span>
                </div>
              );
            })}
            {!played.length && <p className="text-sm text-ink-400">Sin marcas todavía.</p>}
          </div>
        </Glass>
      </div>
    </div>
  );
}
