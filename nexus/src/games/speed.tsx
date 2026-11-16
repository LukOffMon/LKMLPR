import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, mean, median, rand, scale, shuffle, sleep } from '../core/rng';
import { C, GetReady, useFinish } from './kit';
import { GameHud, Pill, cx, useKey } from '../components/ui';
import { useStore } from '../core/store';
import { isUnlocked } from '../core/skills';

// ─────────────────────────── Tablas de Schulte / Gorbov ───────────────────────────
function SchulteRun({ level, short, onFinish, dual }: GameProps & { dual: boolean }) {
  const finish = useFinish(onFinish);
  const size = dual ? 7 : short ? 4 : clamp(3 + Math.ceil(level / 2), 4, 7);
  const cells = useMemo(() => {
    if (!dual) return shuffle([...Array(size * size)].map((_, i) => ({ n: i + 1, c: 0 })));
    const a = [...Array(25)].map((_, i) => ({ n: i + 1, c: 0 }));
    const b = [...Array(24)].map((_, i) => ({ n: i + 1, c: 1 }));
    return shuffle([...a, ...b]);
  }, [size, dual]);
  // Orden objetivo: clásico 1..N; Gorbov: cian 1, ámbar 24, cian 2, ámbar 23…
  const order = useMemo(() => {
    if (!dual) return cells.map((_, i) => ({ n: i + 1, c: 0 }));
    const o: { n: number; c: number }[] = [];
    for (let i = 0; i < 25; i++) {
      o.push({ n: i + 1, c: 0 });
      if (i < 24) o.push({ n: 24 - i, c: 1 });
    }
    return o;
  }, [cells, dual]);
  const [k, setK] = useState(0);
  const [started, setStarted] = useState(false);
  const [err, setErr] = useState(0);
  const [bad, setBad] = useState<number | null>(null);
  const t0 = useRef(0);
  const tap = (i: number) => {
    const c = cells[i];
    const want = order[k];
    if (c.n === want.n && c.c === want.c) {
      if (k + 1 === order.length) {
        const secs = (performance.now() - t0.current) / 1000;
        feedback(true);
        const acc = order.length / (order.length + err);
        const target = dual ? 90 : size * size * 1.4;
        finish({ score: Math.round(secs * 10) / 10, accuracy: secs < target ? Math.max(acc, 0.86) : acc * 0.7, metrics: { errores: err, tamaño: size }, summary: `${size}×${size}${dual ? ' Gorbov' : ''} en ${secs.toFixed(1)} s con ${err} errores` });
      }
      setK(k + 1);
    } else {
      setErr(err + 1);
      setBad(i);
      feedback(false);
      setTimeout(() => setBad(null), 250);
    }
  };
  if (!started) return <GetReady onDone={() => (setStarted(true), (t0.current = performance.now()))} />;
  const want = order[k];
  return (
    <div className="mx-auto max-w-[480px]">
      <GameHud>
        <span>
          Busca:{' '}
          <b className="font-mono text-lg" style={{ color: want?.c ? C.spd : C.att }}>
            {want?.n}
          </b>
        </span>
        <span>Errores: {err}</span>
      </GameHud>
      <div className="relative">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}>
          {cells.map((c, i) => (
            <button key={i} onPointerDown={() => tap(i)} className={cx('flex aspect-square items-center justify-center rounded-lg border font-display font-semibold transition-colors', size >= 7 ? 'text-lg' : 'text-2xl', bad === i ? 'border-rose-400 bg-rose-400/20' : 'border-white/[.07] bg-white/[.04]')} style={{ color: dual ? (c.c ? C.spd : C.att) : '#e7eaf3' }}>
              {c.n}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-spd/80" />
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">Mantén la mirada en el punto central e intenta encontrar los números con la visión periférica.</p>
    </div>
  );
}

function Schulte(p: GameProps) {
  const gorbovOk = useStore((s) => isUnlocked(s, 'gorbov'));
  const [mode, setMode] = useState<null | boolean>(p.short ? false : null);
  if (mode !== null) return <SchulteRun {...p} dual={mode} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button onClick={() => setMode(false)} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-left hover:border-spd/50">
        <div className="font-display text-lg font-semibold">Clásica</div>
        <div className="text-sm text-ink-400">Números del 1 al N en orden. Tamaño según tu nivel.</div>
      </button>
      <button disabled={!gorbovOk} onClick={() => setMode(true)} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-left hover:border-spd/50 disabled:opacity-50">
        <div className="font-display text-lg font-semibold">Gorbov (dos colores)</div>
        <div className="text-sm text-ink-400">Alterna: cian ascendente (1, 2, 3…) y ámbar descendente (24, 23…).</div>
        {!gorbovOk && <div className="mt-2"><Pill color={C.spd}>Se desbloquea en el árbol de habilidades</Pill></div>}
      </button>
    </div>
  );
}

export const schulte: GameDef = {
  id: 'schulte',
  name: 'Tablas de Schulte',
  domain: 'velocidad',
  tagline: 'Encuentra los números en orden lo más rápido posible.',
  instructions: ['Toca los números en orden ascendente.', 'Fija la vista en el centro y usa la visión periférica.', 'Variante Gorbov: alterna dos secuencias de colores (se desbloquea con práctica).'],
  why: 'Las tablas de Schulte entrenan la velocidad de búsqueda visual y la amplitud del campo atencional. La variante de Gorbov añade alternancia entre dos reglas, que exige flexibilidad cognitiva.',
  maxLevel: 8,
  scoreUnit: 's',
  higherBetter: false,
  normalize: (r, level) => clamp(scale(60 - r.score, 0, 50) * 0.6 + level * 5, 0, 100),
  Component: Schulte,
};

// ─────────────────────────── Tiempo de reacción ───────────────────────────
function Reaction({ short, onFinish, level }: GameProps) {
  const finish = useFinish(onFinish);
  const [mode, setMode] = useState<null | 'simple' | 'choice'>(short ? 'simple' : null);
  const n = short ? 8 : 15;
  const [i, setI] = useState(0);
  const [state, setState] = useState<'wait' | 'go' | 'early' | 'fb'>('wait');
  const [target, setTarget] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const rts = useRef<number[]>([]);
  const errs = useRef(0);
  const t0 = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const nChoices = level >= 5 ? 4 : 2;
  useEffect(() => {
    if (short) arm();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const arm = () => {
    setState('wait');
    timer.current = setTimeout(() => {
      setTarget(rand(nChoices));
      setState('go');
      t0.current = performance.now();
    }, 900 + rand(1800));
  };
  const respond = (c: number) => {
    if (state === 'wait') {
      clearTimeout(timer.current);
      setState('early');
      errs.current++;
      feedback(false);
      setTimeout(arm, 900);
      return;
    }
    if (state !== 'go') return;
    const rt = performance.now() - t0.current;
    const ok = mode === 'simple' || c === target;
    if (ok) rts.current.push(rt);
    else errs.current++;
    feedback(ok);
    setLast(Math.round(rt));
    setState('fb');
    if (i + 1 >= n) {
      const med = Math.round(median(rts.current));
      setTimeout(() => finish({ score: med, accuracy: rts.current.length / (rts.current.length + errs.current), metrics: { media: Math.round(mean(rts.current)), mejor: Math.round(Math.min(...rts.current)), errores: errs.current, modo: mode === 'simple' ? 1 : 2 }, summary: `${mode === 'simple' ? 'Simple' : `Elección (${nChoices})`}: mediana ${med} ms, mejor ${Math.round(Math.min(...rts.current))} ms` }), 600);
      return;
    }
    setI(i + 1);
    setTimeout(arm, 700);
  };
  useKey((e) => {
    if (!mode) return;
    if (mode === 'simple' && e.key === ' ') {
      e.preventDefault();
      respond(0);
    }
    const map: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, ArrowLeft: 0, ArrowRight: 1 };
    if (mode === 'choice' && e.key in map) respond(nChoices === 2 && (e.key === 'j' || e.key === 'k') ? 1 : map[e.key]);
  }, [state, mode, target, i]);

  if (!mode)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => (setMode('simple'), arm())} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-left hover:border-spd/50">
          <div className="font-display text-lg font-semibold">Simple</div>
          <div className="text-sm text-ink-400">Pulsa en cuanto la pantalla se encienda.</div>
        </button>
        <button onClick={() => (setMode('choice'), arm())} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-left hover:border-spd/50">
          <div className="font-display text-lg font-semibold">De elección ({nChoices} opciones)</div>
          <div className="text-sm text-ink-400">Pulsa el botón de la posición que se ilumina.</div>
        </button>
      </div>
    );
  const label = state === 'wait' ? 'Espera…' : state === 'early' ? '¡Demasiado pronto!' : state === 'go' ? (mode === 'simple' ? '¡YA!' : '') : `${last} ms`;
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span className="font-mono">{rts.current.length ? `Media ${Math.round(mean(rts.current))} ms` : ''}</span>
      </GameHud>
      {mode === 'simple' ? (
        <button onPointerDown={() => respond(0)} className="flex h-72 w-full items-center justify-center rounded-2xl border border-white/[.06] font-display text-4xl font-bold transition-colors duration-75" style={{ background: state === 'go' ? C.spd : state === 'early' ? 'rgba(251,113,133,.25)' : 'rgba(15,20,36,.7)', color: state === 'go' ? '#05070d' : '#e7eaf3' }}>
          {label}
        </button>
      ) : (
        <div>
          <div className="mb-3 h-8 text-center font-display text-xl">{label}</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${nChoices}, minmax(0,1fr))` }}>
            {[...Array(nChoices).keys()].map((c) => (
              <button key={c} onPointerDown={() => respond(c)} className="flex h-40 items-end justify-center rounded-2xl border border-white/[.06] pb-2 font-mono text-xs text-ink-400 transition-colors duration-75" style={{ background: state === 'go' && target === c ? C.spd : 'rgba(15,20,36,.7)' }}>
                {nChoices === 2 ? ['← / D', '→ / J'][c] : ['D', 'F', 'J', 'K'][c]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const reaction: GameDef = {
  id: 'reaction',
  name: 'Tiempo de reacción',
  domain: 'velocidad',
  tagline: 'Reacción simple y de elección, medida en milisegundos.',
  instructions: ['Simple: pulsa (o toca) en cuanto la pantalla se encienda.', 'De elección: pulsa la posición iluminada. Con nivel ≥ 5 hay 4 opciones.', 'Si pulsas antes de tiempo cuenta como error.'],
  why: 'El tiempo de reacción refleja la velocidad de procesamiento básica. El de elección añade una decisión, y su aumento con el número de opciones (ley de Hick) muestra el coste de procesar información.',
  keys: 'Espacio · D F J K · ← →',
  maxLevel: 8,
  scoreUnit: 'ms',
  higherBetter: false,
  normalize: (r) => clamp(scale(r.metrics?.modo === 2 ? 650 - r.score : 520 - r.score, 0, 300) * r.accuracy, 0, 100),
  Component: Reaction,
};

// ─────────────────────────── Búsqueda visual ───────────────────────────
function Search({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 8 : 16;
  const count = clamp(8 + level * 4, 10, 60);
  const conj = level >= 4; // búsqueda por conjunción (color + forma)
  const [i, setI] = useState(-1);
  const [items, setItems] = useState<{ x: number; y: number; t: boolean; rot: number; col: string; shape: 'T' | 'L' }[]>([]);
  const [fb, setFb] = useState<number | null>(null);
  const rts = useRef<number[]>([]);
  const errs = useRef(0);
  const t0 = useRef(0);
  const make = () => {
    const pts: { x: number; y: number }[] = [];
    let guard = 0;
    while (pts.length < count && guard++ < 4000) {
      const p = { x: 5 + Math.random() * 90, y: 5 + Math.random() * 90 };
      if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 8.5)) pts.push(p);
    }
    const ti = rand(pts.length);
    return pts.map((p, k) => {
      const t = k === ti;
      if (!conj) return { ...p, t, rot: [0, 90, 180, 270][rand(4)], col: C.spd, shape: (t ? 'T' : 'L') as 'T' | 'L' };
      // conjunción: objetivo T ámbar; distractores T cian o L ámbar
      const dist = rand(2) === 0;
      return { ...p, t, rot: [0, 90, 180, 270][rand(4)], col: t ? C.spd : dist ? C.att : C.spd, shape: (t ? 'T' : dist ? 'T' : 'L') as 'T' | 'L' };
    });
  };
  const start = async (k: number) => {
    if (k >= n) {
      const med = Math.round(median(rts.current));
      finish({ score: med, accuracy: rts.current.length / (rts.current.length + errs.current), metrics: { elementos: count, errores: errs.current }, summary: `Encontrado en ${med} ms de mediana entre ${count} elementos` });
      return;
    }
    setI(k);
    setItems([]);
    await sleep(400);
    setItems(make());
    t0.current = performance.now();
  };
  const tap = (k: number) => {
    if (!items.length) return;
    const ok = items[k].t;
    feedback(ok);
    if (ok) {
      rts.current.push(performance.now() - t0.current);
      setFb(null);
      void start(i + 1);
    } else {
      errs.current++;
      setFb(k);
      setTimeout(() => setFb(null), 300);
    }
  };
  if (i < 0) return <GetReady onDone={() => start(0)} />;
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span>
          Objetivo: <b style={{ color: C.spd }}>T {conj ? 'ámbar' : ''}</b>
        </span>
      </GameHud>
      <div className="relative aspect-square w-full rounded-2xl border border-white/[.07] bg-ink-900/60">
        {items.map((it, k) => (
          <button key={k} onPointerDown={() => tap(k)} className={cx('absolute flex h-[8%] w-[8%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md font-display text-2xl font-bold', fb === k && 'bg-rose-400/30')} style={{ left: `${it.x}%`, top: `${it.y}%`, color: it.col }} aria-label={it.t ? 'objetivo' : 'distractor'}>
            <motion.span style={{ rotate: it.rot, display: 'inline-block' }}>{it.shape}</motion.span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const search: GameDef = {
  id: 'search',
  name: 'Búsqueda visual',
  domain: 'velocidad',
  tagline: 'Localiza la T escondida entre letras L.',
  instructions: ['Toca la letra T (en cualquier orientación) lo antes posible.', 'Las demás son L rotadas.', 'Desde el nivel 4, la T objetivo es ámbar y hay T cian de distracción (búsqueda por conjunción).'],
  why: 'La búsqueda T-entre-L no puede resolverse «a simple vista»: exige desplazar la atención elemento a elemento (búsqueda serial, Treisman). Mide y entrena la velocidad del escaneo atencional.',
  maxLevel: 12,
  scoreUnit: 'ms',
  higherBetter: false,
  normalize: (r, level) => clamp(scale(4000 - r.score, 0, 3200) * 0.6 + level * 4, 0, 100),
  Component: Search,
};

