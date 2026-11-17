import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, pick, rand, randInt, scale } from '../core/rng';
import { C, Choices, GetReady, NumPad, useFinish } from './kit';
import { GameHud, TimerRing, cx, useCountdown } from '../components/ui';

// ─────────────────────────── Aritmética progresiva ───────────────────────────
function genProblem(level: number): { q: string; a: number } {
  const L = clamp(level, 1, 12);
  const kinds = ['add1', 'add2', 'sub2', 'mul', 'add2b', 'mul21', 'div', 'mul22', 'add3', 'sq', 'pct', 'mix'].slice(0, Math.max(2, L));
  const k = pick(kinds.slice(Math.max(0, L - 5)));
  switch (k) {
    case 'add1': { const a = randInt(2, 9), b = randInt(2, 9); return { q: `${a} + ${b}`, a: a + b }; }
    case 'add2': { const a = randInt(11, 59), b = randInt(2, 9); return { q: `${a} + ${b}`, a: a + b }; }
    case 'sub2': { const a = randInt(20, 99), b = randInt(2, a - 5); return { q: `${a} − ${b}`, a: a - b }; }
    case 'mul': { const a = randInt(2, 9), b = randInt(2, 9); return { q: `${a} × ${b}`, a: a * b }; }
    case 'add2b': { const a = randInt(12, 89), b = randInt(12, 89); return { q: `${a} + ${b}`, a: a + b }; }
    case 'mul21': { const a = randInt(12, 49), b = randInt(3, 9); return { q: `${a} × ${b}`, a: a * b }; }
    case 'div': { const b = randInt(3, 12), a = b * randInt(3, 15); return { q: `${a} ÷ ${b}`, a: a / b }; }
    case 'mul22': { const a = randInt(11, 39), b = randInt(11, 29); return { q: `${a} × ${b}`, a: a * b }; }
    case 'add3': { const a = randInt(120, 899), b = randInt(120, 899); return rand(2) ? { q: `${a} + ${b}`, a: a + b } : { q: `${Math.max(a, b)} − ${Math.min(a, b)}`, a: Math.max(a, b) - Math.min(a, b) }; }
    case 'sq': { const a = randInt(11, 35); return { q: `${a}²`, a: a * a }; }
    case 'pct': { const p = pick([5, 10, 15, 20, 25, 30, 40, 50, 75]), b = randInt(2, 40) * 20; return { q: `${p} % de ${b}`, a: (p * b) / 100 }; }
    default: { const a = randInt(2, 12), b = randInt(2, 12), c = randInt(5, 60); return { q: `${a} × ${b} + ${c}`, a: a * b + c }; }
  }
}

function Arithmetic({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const secs = short ? 40 : 60;
  const [started, setStarted] = useState(false);
  const [p, setP] = useState(() => genProblem(level));
  const [val, setVal] = useState('');
  const [ok, setOk] = useState(0);
  const [tot, setTot] = useState(0);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const left = useCountdown(secs, started, () => {
    const target = 10 + level;
    finish({ score: ok, accuracy: (tot ? ok / tot : 0) * clamp(ok / target + 0.15, 0, 1), metrics: { intentos: tot }, summary: `${ok} operaciones correctas en ${secs} s (${tot ? Math.round((ok / tot) * 100) : 0} % de precisión)` });
  });
  const submit = () => {
    if (!val || val === '-') return;
    const good = Number(val) === p.a;
    feedback(good);
    setFb(good ? 'ok' : 'bad');
    setTot(tot + 1);
    if (good) setOk(ok + 1);
    setP(genProblem(level));
    setVal('');
  };
  if (!started) return <GetReady onDone={() => setStarted(true)} />;
  return (
    <div className="mx-auto max-w-sm">
      <GameHud>
        <span>Correctas: {ok}</span>
        <TimerRing left={left} total={secs} color={C.cal} />
      </GameHud>
      <motion.div key={p.q + tot} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cx('mb-2 text-center font-mono text-5xl font-bold', fb === 'bad' && 'text-rose-300')} style={{ color: fb === 'bad' ? undefined : C.cal }}>
        {p.q}
      </motion.div>
      <div className="mb-3 h-10 text-center font-mono text-3xl text-ink-100">{val || <span className="text-ink-600">?</span>}</div>
      <NumPad value={val} onChange={setVal} onSubmit={submit} allowDot color={C.cal} />
    </div>
  );
}

export const arithmetic: GameDef = {
  id: 'arithmetic',
  name: 'Aritmética progresiva',
  domain: 'calculo',
  tagline: 'Sprint de cálculo mental de 60 segundos.',
  instructions: ['Resuelve tantas operaciones como puedas en 60 s.', 'La dificultad sube por niveles: sumas, tablas, multiplicaciones de dos cifras, cuadrados, porcentajes…', 'Escribe la respuesta y pulsa Enter.'],
  why: 'La fluidez aritmética libera memoria de trabajo para problemas más complejos. Practicar con presión temporal ligera automatiza hechos numéricos y estrategias (descomponer, redondear y compensar).',
  keys: '0–9 · Enter',
  maxLevel: 12,
  scoreUnit: 'correctas',
  higherBetter: true,
  normalize: (r, level) => clamp(scale(r.score, 4, 25) * 0.5 + level * 4.5, 0, 100),
  Component: Arithmetic,
};

// ─────────────────────────── Cálculo de fechas ───────────────────────────
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function genDate(level: number) {
  const now = new Date().getFullYear();
  const [y0, y1] = level <= 1 ? [now, now] : level <= 3 ? [1950, 2049] : level <= 5 ? [1900, 2099] : [1600, 2399];
  const y = randInt(y0, y1), m = rand(12);
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = randInt(1, dim);
  const dt = new Date(Date.UTC(2000, 0, 1));
  dt.setUTCFullYear(y, m, d);
  return { y, m, d, wd: dt.getUTCDay() };
}

function Dates({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 5 : 10;
  const items = useMemo(() => [...Array(n)].map(() => genDate(level)), [n, level]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const correct = useRef(0);
  const times = useRef<number[]>([]);
  const t0 = useRef(performance.now());
  const it = items[i];
  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      <div className="mb-1 text-center text-xs uppercase tracking-[.16em] text-ink-400">¿Qué día de la semana fue / será?</div>
      <div className="mb-5 text-center font-display text-4xl font-bold" style={{ color: C.cal }}>
        {it.d} de {MONTHS[it.m]} de {it.y}
      </div>
      <Choices
        cols={4}
        options={[1, 2, 3, 4, 5, 6, 0]}
        disabled={picked !== null}
        state={(o) => (picked === null ? null : o === it.wd ? 'ok' : o === picked ? 'bad' : 'dim')}
        render={(o) => <span className="text-sm font-medium">{DAYS[o]}</span>}
        onPick={(o) => {
          const ok = o === it.wd;
          times.current.push(performance.now() - t0.current);
          if (ok) correct.current++;
          feedback(ok);
          setPicked(o);
          setTimeout(() => {
            setPicked(null);
            t0.current = performance.now();
            if (i + 1 < n) setI(i + 1);
            else {
              const avg = times.current.reduce((a, b) => a + b, 0) / times.current.length / 1000;
              finish({ score: correct.current, accuracy: correct.current / n, metrics: { segundosMedia: Math.round(avg * 10) / 10 }, summary: `${correct.current}/${n} fechas · ${avg.toFixed(1)} s por fecha` });
            }
          }, ok ? 700 : 1500);
        }}
      />
      <details className="mt-5 rounded-xl bg-white/[.03] p-3 text-sm text-ink-300">
        <summary className="cursor-pointer font-medium text-ink-200">Método Doomsday (resumen)</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Ancla del siglo: 1900 → miércoles, 2000 → martes (1600 → martes, 1700 → domingo, 1800 → viernes, 2100 → domingo, 2200 → viernes, 2300 → miércoles).</li>
          <li>Para las dos últimas cifras (aa): ⌊aa/12⌋ + (aa mod 12) + ⌊(aa mod 12)/4⌋, súmalo al ancla (módulo 7) → «doomsday» del año.</li>
          <li>Días doomsday fáciles: 4/4, 6/6, 8/8, 10/10, 12/12, 9/5, 5/9, 11/7, 7/11, el último día de febrero y el 3/1 (4/1 en bisiesto).</li>
          <li>Cuenta la distancia desde el doomsday más cercano del mes.</li>
        </ol>
      </details>
    </div>
  );
}

export const dates: GameDef = {
  id: 'dates',
  name: 'Cálculo de fechas',
  domain: 'calculo',
  tagline: 'El día de la semana de cualquier fecha, de cabeza.',
  instructions: ['Calcula el día de la semana de la fecha mostrada.', 'Usa el algoritmo Doomsday de John Conway (resumen debajo de las opciones).', 'Los niveles amplían el rango de años: del año actual hasta 1600–2399.'],
  why: 'El cálculo de calendario es un ejercicio clásico de mnemonistas: combina aritmética modular, anclas memorizadas y memoria de trabajo. Su dominio muestra cómo un algoritmo bien aprendido convierte una tarea «imposible» en rutinaria.',
  maxLevel: 8,
  scoreUnit: 'fechas',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 55 + level * 5.5, 0, 100),
  Component: Dates,
};

// ─────────────────────────── Estimación ───────────────────────────
type Est = { kind: 'dots'; n: number; dots: [number, number][] } | { kind: 'calc'; q: string; a: number };
function genEst(level: number): Est {
  if (Math.random() < 0.4) {
    const n = randInt(15 + level * 5, 40 + level * 15);
    const dots: [number, number][] = [];
    let tries = 0;
    while (dots.length < n) {
      const p: [number, number] = [3 + Math.random() * 94, 3 + Math.random() * 94];
      if (dots.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 2.6) || ++tries > 20000) dots.push(p);
    }
    return { kind: 'dots', n, dots };
  }
  const t = rand(4);
  if (t === 0) { const a = randInt(23, 99) * (level > 3 ? 10 : 1), b = randInt(17, 89); return { kind: 'calc', q: `${a} × ${b}`, a: a * b }; }
  if (t === 1) { const a = randInt(1000, 9999), b = randInt(7, 49); return { kind: 'calc', q: `${a} ÷ ${b}`, a: a / b }; }
  if (t === 2) { const p = randInt(11, 89), b = randInt(150, 3000); return { kind: 'calc', q: `${p} % de ${b}`, a: (p * b) / 100 }; }
  const xs = [...Array(5)].map(() => randInt(120, 990));
  return { kind: 'calc', q: xs.join(' + '), a: xs.reduce((s, x) => s + x, 0) };
}

function Estimation({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 5 : 10;
  const tol = clamp(0.15 - level * 0.01, 0.05, 0.15);
  const items = useMemo(() => [...Array(n)].map(() => genEst(level)), [n, level]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [phase, setPhase] = useState<'show' | 'answer' | 'fb'>('show');
  const [res, setRes] = useState<{ ok: boolean; err: number; truth: number } | null>(null);
  const correct = useRef(0);
  const errs = useRef<number[]>([]);
  const it = items[i];
  const showSecs = it.kind === 'dots' ? 1.5 : 6;
  const left = useCountdown(showSecs, phase === 'show', () => setPhase('answer'), i);
  const submit = () => {
    if (!val || phase === 'fb') return;
    const truth = it.kind === 'dots' ? it.n : it.a;
    const err = Math.abs(Number(val) - truth) / truth;
    const ok = err <= tol;
    if (ok) correct.current++;
    errs.current.push(err);
    feedback(ok);
    setRes({ ok, err, truth });
    setPhase('fb');
    setTimeout(() => {
      setRes(null);
      setVal('');
      if (i + 1 < n) {
        setI(i + 1);
        setPhase('show');
      } else {
        const mErr = errs.current.reduce((a, b) => a + b, 0) / errs.current.length;
        finish({ score: correct.current, accuracy: correct.current / n, metrics: { errorMedio: Math.round(mErr * 100) }, summary: `${correct.current}/${n} dentro del ±${Math.round(tol * 100)} % · error medio ${Math.round(mErr * 100)} %` });
      }
    }, 1500);
  };
  return (
    <div className="mx-auto max-w-md">
      <GameHud>
        <span>{i + 1}/{n} · margen ±{Math.round(tol * 100)} %</span>
        {phase === 'show' && <TimerRing left={left} total={showSecs} color={C.cal} />}
      </GameHud>
      {it.kind === 'dots' ? (
        <div className="relative mx-auto mb-3 aspect-square w-full max-w-[320px] rounded-2xl border border-white/[.07] bg-ink-900/70">
          {phase === 'show' ? it.dots.map(([x, y], k) => <span key={k} className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${x}%`, top: `${y}%`, background: C.cal }} />) : <div className="flex h-full items-center justify-center text-ink-400">¿Cuántos puntos había?</div>}
        </div>
      ) : (
        <div className="mb-3 text-center">
          <div className="text-xs uppercase tracking-[.16em] text-ink-400">Estima (sin calcular exacto)</div>
          <div className="my-3 font-mono text-3xl font-bold sm:text-4xl" style={{ color: C.cal }}>{it.q}</div>
        </div>
      )}
      <div className="mb-3 h-10 text-center font-mono text-3xl">{val || <span className="text-ink-600">≈ ?</span>}</div>
      {res && <div className={cx('mb-3 rounded-xl p-2 text-center text-sm', res.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200')}>Valor real: {Math.round(res.truth * 100) / 100} · error {Math.round(res.err * 100)} %</div>}
      <NumPad value={val} onChange={setVal} onSubmit={submit} disabled={phase === 'fb'} color={C.cal} />
    </div>
  );
}

export const estimation: GameDef = {
  id: 'estimation',
  name: 'Estimación',
  domain: 'calculo',
  tagline: 'Aproxima cantidades y resultados rápidamente.',
  instructions: ['Estima cuántos puntos ves (se muestran 1,5 s) o el resultado aproximado de una operación.', 'Aciertas si quedas dentro del margen (±15 % al empezar; se estrecha con el nivel).', 'Redondea y compensa: 47 × 83 ≈ 50 × 80.'],
  why: 'La estimación numérica se apoya en el «sentido numérico» (sistema numérico aproximado) y en estrategias de redondeo. Es una habilidad muy útil en la vida diaria y protege frente a errores de magnitud.',
  maxLevel: 10,
  scoreUnit: 'aciertos',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 55 + level * 4.5, 0, 100),
  Component: Estimation,
};
