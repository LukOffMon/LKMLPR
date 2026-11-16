import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit } from 'lucide-react';
import { getState, update } from '../core/store';
import { DOMAIN, DOMAINS } from '../core/domains';
import { ASSESSMENT, GAME } from '../games';
import type { Domain } from '../core/types';
import { GameRunner } from '../components/GameRunner';
import { Radar } from '../components/charts';
import { Button, Glass, inputCls } from '../components/ui';
import { useNav } from './nav';
import { sfx } from '../core/audio';

export function Onboarding() {
  const { setFocus, go } = useNav();
  const [step, setStep] = useState<'welcome' | 'intro' | 'battery' | 'profile'>('welcome');
  const [name, setName] = useState(getState().profile.name);
  const [idx, setIdx] = useState(0);

  const advance = () => {
    // guarda el índice normalizado del último ejercicio de la batería
    const id = ASSESSMENT[idx];
    const ses = [...getState().sessions].reverse().find((x) => x.gameId === id);
    if (ses) update((d) => void ((d.profile.assessment ??= {})[GAME[id].domain] = ses.normalized));
    if (idx + 1 < ASSESSMENT.length) setIdx(idx + 1);
    else setStep('profile');
  };
  const finish = () => {
    update((d) => {
      d.profile.onboarded = true;
      d.profile.name = name.trim();
    });
    go('inicio');
  };

  if (step === 'welcome')
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-300 text-ink-950"><BrainCircuit /></div>
            <span className="font-display text-2xl font-bold tracking-[.2em]">NEXUS</span>
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl" style={{ textWrap: 'balance' } as React.CSSProperties}>
            Un laboratorio para entrenar tu memoria y tu mente.
          </h1>
          <p className="mt-4 text-lg text-ink-300">39 módulos basados en técnicas con respaldo científico: método de loci, repetición espaciada, recuperación activa, dificultad adaptativa e intercalado.</p>
          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              sfx.unlock();
              update((d) => void (d.profile.name = name.trim()));
              setStep('intro');
            }}
          >
            <input id="onb-name" autoFocus className={inputCls} placeholder="¿Cómo te llamas?" value={name} onChange={(e) => setName(e.target.value)} />
            <Button size="lg" type="submit" variant="primary" accent="#a78bfa" icon={<ArrowRight size={18} />}>Empezar</Button>
          </form>
        </motion.div>
      </div>
    );

  if (step === 'intro')
    return (
      <div className="mx-auto max-w-3xl py-6">
        <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Evaluación inicial · 8–10 min</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Midamos tu punto de partida{name ? `, ${name}` : ''}</h1>
        <p className="mt-3 text-ink-300">Harás 9 pruebas cortas, una por dominio. Con ellas generamos tu Perfil Cognitivo y calibramos la dificultad inicial. No hay respuestas buenas o malas: es solo tu línea base.</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {ASSESSMENT.map((id, i) => {
            const d = DOMAIN[GAME[id].domain];
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-white/[.07] bg-white/[.03] p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: d.color }}>{d.name}</div>
                <div className="text-sm text-ink-200">{GAME[id].name}</div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" variant="primary" accent="#a78bfa" icon={<ArrowRight size={18} />} onClick={() => setStep('battery')}>Comenzar evaluación</Button>
          <Button size="lg" variant="ghost" onClick={finish}>Saltar por ahora</Button>
        </div>
      </div>
    );

  if (step === 'battery')
    return (
      <div>
        <div className="mx-auto mb-4 flex max-w-5xl items-center gap-2">
          {ASSESSMENT.map((id, i) => (
            <div key={id} className="h-1.5 flex-1 rounded-full" style={{ background: i < idx ? DOMAIN[GAME[id].domain].color : i === idx ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.1)' }} />
          ))}
        </div>
        <GameRunner key={ASSESSMENT[idx]} gameId={ASSESSMENT[idx]} mode="assessment" setFocus={setFocus} onExit={advance} onNext={advance} nextLabel={idx + 1 < ASSESSMENT.length ? `Siguiente prueba (${idx + 2}/${ASSESSMENT.length})` : 'Ver mi perfil'} />
      </div>
    );

  const a = getState().profile.assessment ?? {};
  const vals = Object.fromEntries(DOMAINS.map((d) => [d.id, a[d.id] ?? null])) as Record<Domain, number | null>;
  const sorted = DOMAINS.filter((d) => a[d.id] !== undefined).sort((x, y) => (a[y.id] ?? 0) - (a[x.id] ?? 0));
  return (
    <div className="mx-auto grid max-w-4xl items-center gap-6 py-6 md:grid-cols-2">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <Radar values={vals} />
      </motion.div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Tu perfil cognitivo</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">Punto de partida registrado</h1>
        {sorted.length > 0 && (
          <Glass className="mt-4 p-4 text-sm text-ink-300">
            <p>
              Fortaleza relativa: <b style={{ color: sorted[0].color }}>{sorted[0].name}</b>.
            </p>
            <p className="mt-1">
              Mayor margen de mejora: <b style={{ color: sorted[sorted.length - 1].color }}>{sorted[sorted.length - 1].name}</b>. Tu rutina diaria le dará prioridad.
            </p>
          </Glass>
        )}
        <p className="mt-4 text-sm text-ink-400">Los índices (0–100) son relativos a la escala de cada prueba, no un CI. Lo importante es tu evolución.</p>
        <Button className="mt-6" size="lg" variant="primary" accent="#a78bfa" icon={<ArrowRight size={18} />} onClick={finish}>Ir al Centro de Mando</Button>
      </div>
    </div>
  );
}
