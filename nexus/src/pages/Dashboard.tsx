import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Layers, Play, Sparkles, Trophy, Zap } from 'lucide-react';
import { useStore } from '../core/store';
import { domainProfile, levelFromXp, liveStreak, rankFor, weeklyMinutes } from '../core/progress';
import { DOMAIN, DOMAINS } from '../core/domains';
import { DOMAIN_OF, GAME, GAMES } from '../games';
import { dueCards } from '../core/srs';
import { routineMinutes, todayRoutine } from '../core/routine';
import { ACHIEVEMENTS } from '../core/achievements';
import { Bars, Radar } from '../components/charts';
import { Bar, Button, Glass, Pill, SectionTitle, Stat } from '../components/ui';
import { useNav } from './nav';
import { GameIcon } from './icons';

export function Dashboard() {
  const { go, play } = useNav();
  const s = useStore((x) => x);
  const prof = useMemo(() => domainProfile(s, DOMAIN_OF), [s]);
  const lv = levelFromXp(s.xp);
  const rank = rankFor(lv.level);
  const streak = liveStreak(s);
  const week = weeklyMinutes(s);
  const due = dueCards(s.cards).length;
  const routine = todayRoutine(s);
  const doneToday = routine ? routine.done.length : 0;
  const weakest = useMemo(() => DOMAINS.filter((d) => prof[d.id] !== null).sort((a, b) => (prof[a.id] ?? 0) - (prof[b.id] ?? 0))[0], [prof]);
  const suggestions = useMemo(() => {
    const dom = weakest?.id ?? 'memoria';
    return GAMES.filter((g) => g.domain === dom).slice(0, 3);
  }, [weakest]);
  const recentAch = Object.entries(s.achievements).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const hour = new Date().getHours();
  const hello = hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const totalMin = Math.round(Object.values(s.activity).reduce((a, b) => a + b, 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Centro de mando</div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl" style={{ textWrap: 'balance' } as React.CSSProperties}>
            {hello}{s.profile.name ? `, ${s.profile.name}` : ''}.
          </h1>
        </div>
        <Button size="lg" variant="primary" accent="#a78bfa" icon={<Play size={18} />} onClick={() => go('rutina')}>
          {routine && doneToday > 0 && doneToday < routine.items.length ? 'Continuar rutina' : 'Rutina de hoy'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15"><Flame size={20} className="text-amber-300" /></div>
            <Stat label="Racha" value={`${streak} ${streak === 1 ? 'día' : 'días'}`} sub={`Mejor: ${s.streak.best}`} />
          </div>
        </Glass>
        <Glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/15"><Zap size={20} className="text-violet-300" /></div>
            <Stat label="Nivel" value={lv.level} sub={`${lv.into}/${lv.span} XP`} />
          </div>
          <Bar className="mt-3" value={lv.progress} color="#a78bfa" />
        </Glass>
        <Glass className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15"><Trophy size={20} className="text-cyan-300" /></div>
            <Stat label="Rango" value={<span className="text-lg sm:text-2xl">{rank.name}</span>} sub={rank.next ? `${rank.next.name} en nivel ${rank.next.min}` : 'Rango máximo'} />
          </div>
        </Glass>
        <Glass className="p-4" onClick={() => play('srs')}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-400/15"><Layers size={20} className="text-pink-300" /></div>
            <Stat label="Tarjetas SRS" value={due} sub={due ? 'pendientes hoy · repasar' : 'al día'} />
          </div>
        </Glass>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Glass className="p-5">
          <SectionTitle eyebrow="Perfil cognitivo" title="Tu mapa de dominios" right={<Button size="sm" variant="ghost" onClick={() => go('analiticas')}>Analíticas <ArrowRight size={14} /></Button>} />
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_200px]">
            <div className="mx-auto w-full max-w-[340px]">
              <Radar values={prof} compare={s.profile.assessment} />
            </div>
            <div className="space-y-2">
              {DOMAINS.map((d) => (
                <div key={d.id}>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-300">{d.name}</span>
                    <span className="tabular-nums text-ink-400">{prof[d.id] ?? '—'}</span>
                  </div>
                  <Bar value={(prof[d.id] ?? 0) / 100} color={d.color} height={4} />
                </div>
              ))}
            </div>
          </div>
          {s.profile.assessment && <p className="mt-2 text-xs text-ink-500">Línea discontinua: tu evaluación inicial. Índices 0–100 relativos a la escala de cada ejercicio.</p>}
        </Glass>

        <div className="grid gap-4">
          <Glass className="p-5">
            <SectionTitle eyebrow="Hoy" title="Rutina inteligente" />
            {routine ? (
              <>
                <div className="mb-3 flex items-center justify-between text-sm text-ink-300">
                  <span>{doneToday}/{routine.items.length} ejercicios · ~{routineMinutes(routine.items)} min</span>
                  {doneToday === routine.items.length && <Pill color="#34d399">Completada</Pill>}
                </div>
                <Bar value={doneToday / routine.items.length} color="#a78bfa" />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {routine.items.map((id) => (
                    <span key={id} className="rounded-full px-2.5 py-1 text-xs" style={{ background: `${DOMAIN[GAME[id].domain].color}${routine.done.includes(id) ? '33' : '14'}`, color: DOMAIN[GAME[id].domain].color, textDecoration: routine.done.includes(id) ? 'line-through' : undefined }}>
                      {GAME[id].name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-300">Tu sesión de {s.settings.sessionMinutes} minutos se genera priorizando tus dominios más débiles e intercalando ejercicios.</p>
            )}
            <Button className="mt-4" variant="outline" onClick={() => go('rutina')}>{routine ? 'Ver rutina' : 'Generar rutina'}</Button>
          </Glass>
          <Glass className="p-5">
            <SectionTitle eyebrow="Últimos 7 días" title={`${week.reduce((a, b) => a + b.minutes, 0)} min de entrenamiento`} />
            <Bars data={week.map((d) => ({ label: d.label, value: d.minutes }))} color="#22d3ee" height={96} />
            <div className="mt-2 text-xs text-ink-500">Total acumulado: {totalMin} min · {s.sessions.length} sesiones</div>
          </Glass>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Glass className="p-5">
          <SectionTitle eyebrow="Recomendado" title={weakest ? `Refuerza ${weakest.name.toLowerCase()}` : 'Empieza por la memoria'} />
          <div className="grid gap-2 sm:grid-cols-3">
            {suggestions.map((g) => {
              const d = DOMAIN[g.domain];
              return (
                <motion.button key={g.id} whileHover={{ y: -2 }} onClick={() => play(g.id)} className="rounded-xl border border-white/[.07] bg-white/[.03] p-3 text-left hover:border-white/15">
                  <GameIcon id={g.id} color={d.color} />
                  <div className="mt-2 font-display text-sm font-semibold">{g.name}</div>
                  <div className="line-clamp-2 text-xs text-ink-400">{g.tagline}</div>
                </motion.button>
              );
            })}
          </div>
        </Glass>
        <Glass className="p-5">
          <SectionTitle eyebrow="Logros" title={`${Object.keys(s.achievements).length}/${ACHIEVEMENTS.length} desbloqueados`} right={<Button size="sm" variant="ghost" onClick={() => go('habilidades')}>Ver todo</Button>} />
          {recentAch.length ? (
            <div className="space-y-2">
              {recentAch.map(([id]) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                return a ? (
                  <div key={id} className="flex items-center gap-3">
                    <Sparkles size={16} className="text-amber-300" />
                    <div>
                      <div className="text-sm font-semibold">{a.name}</div>
                      <div className="text-xs text-ink-400">{a.desc}</div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-400">Completa tu primera sesión para desbloquear «Primera sinapsis».</p>
          )}
        </Glass>
      </div>
    </div>
  );
}
