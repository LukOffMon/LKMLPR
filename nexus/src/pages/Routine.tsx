import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Play, RefreshCw, Shuffle } from 'lucide-react';
import { getState, update, useStore } from '../core/store';
import { buildRoutine, routineMinutes, todayRoutine } from '../core/routine';
import { DOMAIN } from '../core/domains';
import { GAME } from '../games';
import { dayKey } from '../core/rng';
import { bus } from '../core/bus';
import { GameRunner } from '../components/GameRunner';
import { Bar, Button, Glass, Pill, SectionTitle } from '../components/ui';
import { useNav } from './nav';
import { GameIcon } from './icons';

export function Routine() {
  const { setFocus, go } = useNav();
  const routine = useStore(todayRoutine);
  const minutes = useStore((s) => s.settings.sessionMinutes);
  const [running, setRunning] = useState<string | null>(null);

  const generate = () => update((d) => void (d.routine = { day: dayKey(), items: buildRoutine(getState()), done: [] }));
  if (!routine) {
    return (
      <div className="mx-auto max-w-2xl pt-6 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Rutina diaria inteligente</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Tu sesión de {minutes} minutos</h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-300">NEXUS analiza tu perfil, prioriza los dominios más débiles, incluye siempre memoria y tus tarjetas SRS pendientes, e intercala ejercicios de distintos dominios (la práctica intercalada mejora la transferencia).</p>
        <Button className="mt-6" size="lg" variant="primary" accent="#a78bfa" icon={<Shuffle size={18} />} onClick={generate}>Generar rutina de hoy</Button>
      </div>
    );
  }
  const pending = routine.items.filter((id) => !routine.done.includes(id));
  const next = pending[0];

  if (running) {
    const after = routine.items.filter((id) => !routine.done.includes(id) && id !== running)[0];
    return (
      <GameRunner
        key={running}
        gameId={running}
        mode="routine"
        setFocus={setFocus}
        onExit={() => setRunning(null)}
        onNext={() => {
          const s = getState().routine!;
          const nx = s.items.find((id) => !s.done.includes(id));
          if (!nx) bus.emit('burst');
          setRunning(nx ?? null);
        }}
        nextLabel={after ? `Siguiente: ${GAME[after].name}` : 'Terminar rutina'}
      />
    );
  }

  const done = routine.done.length === routine.items.length;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Rutina de hoy</div>
          <h1 className="font-display text-3xl font-semibold">{done ? 'Rutina completada' : `${routine.items.length} ejercicios · ~${routineMinutes(routine.items)} min`}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={generate}>Regenerar</Button>
          {!done && (
            <Button size="lg" variant="primary" accent="#a78bfa" icon={<Play size={18} />} onClick={() => setRunning(next)}>
              {routine.done.length ? 'Continuar' : 'Empezar'}
            </Button>
          )}
        </div>
      </div>
      <Bar value={routine.done.length / routine.items.length} color="#a78bfa" className="mb-5" />
      {done && (
        <Glass className="mb-5 p-5">
          <SectionTitle eyebrow="Bien hecho" title="Has completado tu entrenamiento de hoy" />
          <p className="text-sm text-ink-300">El aprendizaje se consolida durante el descanso y el sueño. Vuelve mañana para mantener tu racha; si quieres más, explora la biblioteca.</p>
          <Button className="mt-3" variant="outline" onClick={() => go('biblioteca')}>Ir a la biblioteca</Button>
        </Glass>
      )}
      <div className="space-y-2">
        {routine.items.map((id, i) => {
          const g = GAME[id];
          const d = DOMAIN[g.domain];
          const isDone = routine.done.includes(id);
          return (
            <motion.div key={id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Glass as="button" onClick={() => setRunning(id)} className="flex w-full items-center gap-4 p-3.5">
                <span className="w-5 text-center font-mono text-sm text-ink-500">{i + 1}</span>
                <GameIcon id={id} color={d.color} />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{g.name}</div>
                  <div className="truncate text-sm text-ink-400">{g.tagline}</div>
                </div>
                <Pill color={d.color}>{d.name}</Pill>
                {isDone ? <Check className="text-emerald-300" /> : id === next ? <Play size={18} className="text-ink-300" /> : <span className="w-[18px]" />}
              </Glass>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
