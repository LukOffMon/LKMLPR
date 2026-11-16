import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { rand, scale, sleep } from '../core/rng';
import { C, GetReady, NumPad, useFinish } from './kit';
import { GameHud } from '../components/ui';

function DigitSpan({ level, short, onFinish, backward }: GameProps & { backward: boolean }) {
  const finish = useFinish(onFinish);
  const [phase, setPhase] = useState<'ready' | 'show' | 'input' | 'fb'>('ready');
  const [span, setSpan] = useState(Math.max(2, level + 2));
  const [seq, setSeq] = useState<number[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const [val, setVal] = useState('');
  const [last, setLast] = useState<boolean | null>(null);
  const stats = useRef({ trials: 0, correct: 0, best: 0, failsAtSpan: 0 });
  const maxTrials = short ? 6 : 14;
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const run = async (s: number) => {
    const q: number[] = [];
    while (q.length < s) {
      const d = rand(10);
      if (q[q.length - 1] !== d) q.push(d);
    }
    setSeq(q);
    setVal('');
    setPhase('show');
    await sleep(400);
    for (const d of q) {
      if (!alive.current) return;
      setShown(d);
      await sleep(750);
      setShown(null);
      await sleep(220);
    }
    if (alive.current) setPhase('input');
  };

  const submit = () => {
    if (phase !== 'input' || !val) return;
    const target = (backward ? seq.slice().reverse() : seq).join('');
    const ok = val === target;
    feedback(ok);
    const st = stats.current;
    st.trials++;
    let next = span;
    if (ok) {
      st.correct++;
      st.best = Math.max(st.best, span);
      st.failsAtSpan = 0;
      next = span + 1;
    } else {
      st.failsAtSpan++;
      if (st.failsAtSpan >= 2) next = Math.max(2, span - 1);
    }
    setLast(ok);
    setPhase('fb');
    setTimeout(() => {
      if (st.trials >= maxTrials) {
        finish({ score: st.best, accuracy: st.correct / st.trials, nextLevel: Math.max(1, st.best - 3), metrics: { span: st.best }, summary: `Span máximo: ${st.best} dígitos` });
        return;
      }
      if (next !== span) stats.current.failsAtSpan = 0;
      setSpan(next);
      void run(next);
    }, 1100);
  };

  if (phase === 'ready') return <GetReady onDone={() => run(span)} />;
  return (
    <div>
      <GameHud>
        <span>
          Ensayo {Math.min(stats.current.trials + 1, maxTrials)}/{maxTrials}
        </span>
        <span className="font-mono">Span actual: {span}</span>
        <span>Mejor: {stats.current.best || '—'}</span>
      </GameHud>
      <div className="flex h-40 items-center justify-center">
        {phase === 'show' && (
          <motion.div key={`${shown}-${Math.random()}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-8xl font-bold" style={{ color: C.mem }}>
            {shown ?? ''}
          </motion.div>
        )}
        {phase === 'input' && (
          <div className="text-center">
            <div className="mb-2 text-sm text-ink-400">{backward ? 'Escríbelos en orden INVERSO' : 'Escríbelos en el mismo orden'}</div>
            <div className="min-h-[3rem] font-mono text-4xl tracking-[.3em] text-ink-100">{val || <span className="text-ink-600">{'·'.repeat(span)}</span>}</div>
          </div>
        )}
        {phase === 'fb' && (
          <div className="text-center">
            <div className={last ? 'text-2xl font-semibold text-emerald-300' : 'text-2xl font-semibold text-rose-300'}>{last ? 'Correcto' : 'Incorrecto'}</div>
            {!last && <div className="mt-1 font-mono text-ink-300">Era: {(backward ? seq.slice().reverse() : seq).join(' ')}</div>}
          </div>
        )}
      </div>
      <NumPad value={val} onChange={setVal} onSubmit={submit} disabled={phase !== 'input'} maxLen={16} color={C.mem} />
    </div>
  );
}

export const digits: GameDef = {
  id: 'digits',
  name: 'Secuencia de dígitos',
  domain: 'memoria',
  tagline: 'Retén cadenas de números cada vez más largas.',
  instructions: ['Aparecerán dígitos de uno en uno.', 'Escríbelos en el mismo orden al terminar.', 'Si aciertas, la secuencia crece; dos fallos seguidos la reducen.', 'Truco: agrúpalos en bloques de 2–3 (chunking) y repítelos mentalmente.'],
  why: 'El span de dígitos es una medida clásica de la memoria a corto plazo. Practicar con agrupamiento (chunking) enseña a recodificar la información en menos unidades, que es como los expertos superan el límite de ~4 elementos.',
  keys: '0–9 para escribir · Enter para confirmar',
  maxLevel: 12,
  scoreUnit: 'dígitos',
  higherBetter: true,
  normalize: (r) => scale(r.score, 3, 11),
  Component: (p) => <DigitSpan {...p} backward={false} />,
};

export const digitsBack: GameDef = {
  id: 'digitsback',
  name: 'Dígitos inversos',
  domain: 'atencion',
  tagline: 'Recuerda la secuencia y dila al revés.',
  instructions: ['Aparecerán dígitos de uno en uno.', 'Escríbelos en orden INVERSO: del último al primero.', 'La longitud se adapta a tu rendimiento.'],
  why: 'Invertir la secuencia obliga a manipular la información, no solo a retenerla: es una tarea de memoria de trabajo (ejecutivo central), más ligada al razonamiento que el span directo.',
  keys: '0–9 · Enter',
  maxLevel: 10,
  scoreUnit: 'dígitos',
  higherBetter: true,
  normalize: (r) => scale(r.score, 2, 9),
  Component: (p) => <DigitSpan {...p} backward />,
};
