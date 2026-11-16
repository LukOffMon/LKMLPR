import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Award, BrainCircuit, ChevronRight, FlaskConical, Play, RotateCcw, Sparkles, Target, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { GameDef, RawResult } from '../core/types';
import { GAME, PREDICTABLE } from '../games';
import { DOMAIN } from '../core/domains';
import { useStore } from '../core/store';
import { getLevel, recordSession, type SessionOutcome } from '../core/progress';
import { ACHIEVEMENTS } from '../core/achievements';
import { bus } from '../core/bus';
import { sfx } from '../core/audio';
import { Button, Glass, Kbd, Pill } from './ui';

export type RunMode = 'normal' | 'routine' | 'assessment';

function recommendation(def: GameDef, acc: number, out: SessionOutcome | null) {
  const zone = acc >= 0.9 ? 'Has estado por encima de la zona de esfuerzo deseable: la próxima sesión será más exigente.' : acc >= 0.72 ? 'Estás en la zona de esfuerzo deseable (≈75–85 %), donde más se aprende. Mantén el ritmo.' : 'Ha costado: bajamos un poco la dificultad para que consolides la técnica antes de avanzar.';
  const tip: Record<string, string> = {
    memoria: 'Repasa mañana lo aprendido: un recuerdo recuperado tras dormir se consolida mejor.',
    atencion: 'Haz pausas breves entre bloques; la atención sostenida se agota y se recupera rápido.',
    velocidad: 'La velocidad mejora con repeticiones cortas y frecuentes más que con sesiones largas.',
    razonamiento: 'Verbaliza la regla que estás probando: explicitar hipótesis reduce errores.',
    espacial: 'Antes de responder, imagina el movimiento completo en lugar de comparar piezas sueltas.',
    lenguaje: 'Lee 10 minutos de algo exigente hoy: es el mejor complemento para el vocabulario.',
    calculo: 'Descompón: 47 × 6 = 40 × 6 + 7 × 6. Las estrategias se automatizan con práctica espaciada.',
    creatividad: 'Cuando te atasques, cambia de categoría o de propiedad del objeto.',
    metacognicion: 'Antes de responder, pregúntate qué evidencia concreta tienes para tu confianza.',
  };
  const lvl = out && out.levelChange !== 0 ? ` Nivel ${out.levelChange > 0 ? 'subido' : 'ajustado'} a ${out.newLevel}.` : '';
  return `${zone}${lvl} ${tip[def.domain]}`;
}

export function GameRunner({ gameId, mode = 'normal', onExit, onNext, nextLabel, setFocus }: { gameId: string; mode?: RunMode; onExit: () => void; onNext?: () => void; nextLabel?: string; setFocus: (f: boolean) => void }) {
  const def = GAME[gameId];
  const level = useStore((s) => getLevel(s, gameId));
  const settings = useStore((s) => s.settings);
  const [phase, setPhase] = useState<'intro' | 'play' | 'predict' | 'result' | 'practiceDone'>(mode === 'assessment' ? 'intro' : 'intro');
  const [practice, setPractice] = useState(false);
  const [run, setRun] = useState(0);
  const [raw, setRaw] = useState<RawResult | null>(null);
  const [out, setOut] = useState<SessionOutcome | null>(null);
  const t0 = useRef(0);
  const short = mode === 'assessment' || practice;
  const playLevel = mode === 'assessment' ? Math.max(1, Math.min(level, 3)) : practice ? Math.max(1, level - 1) : level;

  useEffect(() => {
    setFocus(phase === 'play' && settings.focusMode);
    return () => setFocus(false);
  }, [phase, settings.focusMode, setFocus]);
  useEffect(() => {
    setPhase('intro');
    setRaw(null);
    setOut(null);
  }, [gameId]);

  if (!def) return <div className="p-6">Módulo no encontrado.</div>;
  const dom = DOMAIN[def.domain];

  const start = (p: boolean) => {
    sfx.unlock();
    sfx.start();
    setPractice(p);
    setRun((r) => r + 1);
    t0.current = performance.now();
    setPhase('play');
  };
  const commit = (r: RawResult, predicted?: number) => {
    const o = recordSession(def, playLevel, r, performance.now() - t0.current, predicted);
    setOut(o);
    sfx.finish();
    bus.emit('burst');
    if (o.playerLevelUp) setTimeout(() => sfx.level(), 500);
    setPhase('result');
  };
  const onFinish = (r: RawResult) => {
    setRaw(r);
    if (practice) {
      sfx.finish();
      setPhase('practiceDone');
      return;
    }
    if (settings.metacog && mode !== 'assessment' && PREDICTABLE.has(def.id)) setPhase('predict');
    else commit(r);
  };

  const fmtScore = (v: number) => (Number.isInteger(v) ? v : v.toFixed(1));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onExit} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[.07] bg-white/[.04] text-ink-300 hover:text-ink-100" aria-label={phase === 'play' ? 'Salir del ejercicio' : 'Volver'}>
          {phase === 'play' ? <X size={18} /> : <ArrowLeft size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Pill color={dom.color}>{dom.name}</Pill>
            {mode === 'assessment' && <Pill color="#e7eaf3">Evaluación</Pill>}
            {practice && phase === 'play' && <Pill color="#fbbf24">Práctica</Pill>}
          </div>
          <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">{def.name}</h1>
        </div>
        {mode !== 'assessment' && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[.16em] text-ink-400">Nivel</div>
            <div className="font-display text-xl font-semibold tabular-nums" style={{ color: dom.color }}>{level}</div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Glass className="p-5 sm:p-6">
              <p className="mb-4 text-lg text-ink-200">{def.tagline}</p>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-ink-400">Cómo se juega</div>
              <ul className="space-y-2">
                {def.instructions.map((t, i) => (
                  <li key={i} className="flex gap-3 text-[15px] text-ink-200">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dom.color }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              {def.keys && (
                <div className="mt-4 text-sm text-ink-400">
                  Teclado: <Kbd>{def.keys}</Kbd>
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Button size="lg" variant="primary" accent={dom.color} icon={<Play size={18} />} onClick={() => start(false)} autoFocus>
                  {mode === 'assessment' ? 'Comenzar prueba' : def.tool ? 'Abrir módulo' : 'Sesión puntuada'}
                </Button>
                {mode !== 'assessment' && !def.tool && (
                  <Button size="lg" variant="outline" icon={<FlaskConical size={18} />} onClick={() => start(true)}>
                    Práctica
                  </Button>
                )}
              </div>
            </Glass>
            <Glass className="p-5 sm:p-6" accent={dom.color}>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.16em]" style={{ color: dom.color }}>
                <BrainCircuit size={14} /> ¿Por qué funciona?
              </div>
              <p className="text-[15px] leading-relaxed text-ink-200">{def.why}</p>
              <div className="mt-5 border-t border-white/[.06] pt-4 text-sm text-ink-400">
                Dificultad adaptativa: el nivel sube o baja para mantenerte entre el 75 y el 85 % de aciertos.
              </div>
            </Glass>
          </motion.div>
        )}

        {phase === 'play' && (
          <motion.div key={`play-${run}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Glass className="p-4 sm:p-6">
              <def.Component level={playLevel} short={short} practice={practice} onFinish={onFinish} />
            </Glass>
          </motion.div>
        )}

        {phase === 'practiceDone' && raw && (
          <motion.div key="pd" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <Glass className="mx-auto max-w-lg p-6 text-center">
              <div className="text-[11px] uppercase tracking-[.16em] text-ink-400">Práctica completada (no puntúa)</div>
              <div className="my-3 font-display text-4xl font-bold" style={{ color: dom.color }}>
                {fmtScore(raw.score)} <span className="text-lg text-ink-400">{def.scoreUnit}</span>
              </div>
              {raw.summary && <p className="text-ink-300">{raw.summary}</p>}
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="primary" accent={dom.color} icon={<Play size={16} />} onClick={() => start(false)}>Sesión puntuada</Button>
                <Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => start(true)}>Repetir práctica</Button>
              </div>
            </Glass>
          </motion.div>
        )}

        {phase === 'predict' && raw && (
          <motion.div key="predict" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Glass className="mx-auto max-w-lg p-6 text-center">
              <Target className="mx-auto mb-2" color="#cbd5e1" />
              <h3 className="font-display text-xl font-semibold">Antes de ver tu resultado…</h3>
              <p className="mt-1 text-sm text-ink-400">¿Qué porcentaje de aciertos crees que has tenido? (metacognición)</p>
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {[0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => (
                  <button key={v} onClick={() => commit(raw, v)} className="h-12 rounded-xl border border-white/10 bg-white/[.04] font-semibold tabular-nums hover:bg-white/10">
                    {Math.round(v * 100)} %
                  </button>
                ))}
              </div>
              <button onClick={() => commit(raw)} className="mt-4 text-xs text-ink-500 hover:text-ink-300">Omitir</button>
            </Glass>
          </motion.div>
        )}

        {phase === 'result' && raw && out && (
          <motion.div key="res" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Glass className="relative overflow-hidden p-6">
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full blur-3xl" style={{ background: `${dom.color}33` }} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-ink-400">Resultado</span>
                {out.isRecord && <Pill color="#fbbf24"><Sparkles size={12} /> Nuevo récord</Pill>}
                {out.prevBest === null && <Pill color="#34d399">Primera marca</Pill>}
              </div>
              <div className="mt-2 flex items-end gap-3">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="font-display text-6xl font-bold tabular-nums" style={{ color: dom.color }}>
                  {fmtScore(raw.score)}
                </motion.div>
                <div className="pb-2 text-ink-400">{def.scoreUnit}</div>
              </div>
              {raw.summary && <p className="mt-1 text-ink-200">{raw.summary}</p>}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-white/[.04] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">Precisión</div>
                  <div className="font-display text-xl font-semibold tabular-nums">{Math.round(out.session.accuracy * 100)} %</div>
                </div>
                <div className="rounded-xl bg-white/[.04] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">Tu media</div>
                  <div className="flex items-center gap-1 font-display text-xl font-semibold tabular-nums">
                    {out.avg === null ? '—' : fmtScore(Math.round(out.avg * 10) / 10)}
                    {out.avg !== null && ((def.higherBetter ? raw.score >= out.avg : raw.score <= out.avg) ? <TrendingUp size={16} className="text-emerald-300" /> : <TrendingDown size={16} className="text-rose-300" />)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/[.04] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">Índice</div>
                  <div className="font-display text-xl font-semibold tabular-nums">{out.session.normalized}</div>
                </div>
                <div className="rounded-xl bg-white/[.04] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">XP</div>
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="font-display text-xl font-semibold tabular-nums text-amber-300">
                    +{out.xp}
                  </motion.div>
                </div>
              </div>
              {out.session.predicted !== undefined && (
                <p className="mt-4 text-sm text-ink-300">
                  Predijiste <b>{Math.round(out.session.predicted * 100)} %</b> y obtuviste <b>{Math.round(out.session.accuracy * 100)} %</b>
                  {Math.abs(out.session.predicted - out.session.accuracy) <= 0.1 ? ': buena calibración.' : out.session.predicted > out.session.accuracy ? ': te sobrestimaste.' : ': lo hiciste mejor de lo que creías.'}
                </p>
              )}
              {raw.metrics && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {Object.entries(raw.metrics).map(([k, v]) => (
                    <span key={k} className="rounded-full bg-white/[.05] px-2.5 py-1 text-xs text-ink-300">
                      {k.replace(/([A-Z])/g, ' $1').toLowerCase()}: <b className="text-ink-100">{v}</b>
                    </span>
                  ))}
                </div>
              )}
            </Glass>
            <div className="grid gap-4">
              <Glass className="p-5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-ink-400">Recomendación</div>
                <p className="text-[15px] leading-relaxed text-ink-200">{recommendation(def, out.session.accuracy, out)}</p>
              </Glass>
              {(out.newAchievements.length > 0 || out.playerLevelUp) && (
                <Glass className="p-5">
                  {out.playerLevelUp && <div className="mb-2 font-display font-semibold text-amber-300">¡Subes de nivel de jugador!</div>}
                  {out.newAchievements.map((id) => {
                    const a = ACHIEVEMENTS.find((x) => x.id === id)!;
                    return (
                      <div key={id} className="flex items-center gap-3 py-1">
                        <Award size={18} className="text-amber-300" />
                        <div>
                          <div className="text-sm font-semibold">{a.name}</div>
                          <div className="text-xs text-ink-400">{a.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </Glass>
              )}
              <div className="flex flex-wrap gap-2">
                {onNext ? (
                  <Button size="lg" variant="primary" accent={dom.color} icon={<ChevronRight size={18} />} onClick={onNext} autoFocus>
                    {nextLabel ?? 'Siguiente'}
                  </Button>
                ) : (
                  <Button size="lg" variant="primary" accent={dom.color} icon={<RotateCcw size={18} />} onClick={() => start(false)} autoFocus>
                    Otra sesión
                  </Button>
                )}
                {mode !== 'assessment' && <Button size="lg" variant="outline" onClick={onExit}>Salir</Button>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

