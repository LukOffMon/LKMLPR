import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as I from 'lucide-react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, sample, scale, shuffle, sleep } from '../core/rng';
import { C, GetReady, useFinish } from './kit';
import { GameHud, cx } from '../components/ui';

// ─────────────────────────── Bloques de Corsi ───────────────────────────
const CORSI_POS = [
  [12, 18], [46, 10], [80, 22], [26, 44], [62, 40], [88, 58], [10, 74], [44, 72], [74, 86],
];

function Corsi({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const [phase, setPhase] = useState<'ready' | 'show' | 'input' | 'fb'>('ready');
  const [span, setSpan] = useState(level + 1);
  const [lit, setLit] = useState<number | null>(null);
  const [seq, setSeq] = useState<number[]>([]);
  const [taps, setTaps] = useState<number[]>([]);
  const [ok, setOk] = useState<boolean | null>(null);
  const st = useRef({ trials: 0, correct: 0, best: 0, fails: 0 });
  const maxTrials = short ? 5 : 12;
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const run = async (s: number) => {
    const q: number[] = [];
    while (q.length < s) {
      const b = Math.floor(Math.random() * 9);
      if (q[q.length - 1] !== b) q.push(b);
    }
    setSeq(q);
    setTaps([]);
    setPhase('show');
    await sleep(500);
    for (const b of q) {
      if (!alive.current) return;
      setLit(b);
      await sleep(650);
      setLit(null);
      await sleep(250);
    }
    if (alive.current) setPhase('input');
  };

  const tap = (b: number) => {
    if (phase !== 'input') return;
    const t = [...taps, b];
    setTaps(t);
    setLit(b);
    setTimeout(() => setLit((x) => (x === b ? null : x)), 180);
    const wrong = seq[t.length - 1] !== b;
    if (wrong || t.length === seq.length) {
      const good = !wrong;
      feedback(good);
      setOk(good);
      setPhase('fb');
      const s = st.current;
      s.trials++;
      let next = span;
      if (good) {
        s.correct++;
        s.best = Math.max(s.best, span);
        s.fails = 0;
        next = span + 1;
      } else if (++s.fails >= 2) {
        next = Math.max(2, span - 1);
        s.fails = 0;
      }
      setTimeout(() => {
        if (s.trials >= maxTrials) return finish({ score: s.best, accuracy: s.correct / s.trials, nextLevel: Math.max(1, s.best - 2), summary: `Span visoespacial: ${s.best}` });
        setSpan(next);
        void run(next);
      }, 1000);
    }
  };

  if (phase === 'ready') return <GetReady onDone={() => run(span)} />;
  return (
    <div>
      <GameHud>
        <span>
          Ensayo {Math.min(st.current.trials + 1, maxTrials)}/{maxTrials}
        </span>
        <span className="font-mono">Span: {span}</span>
        <span className={cx(phase === 'input' ? 'text-mem' : 'text-ink-400')}>{phase === 'show' ? 'Observa…' : phase === 'input' ? `Toca en orden (${taps.length}/${seq.length})` : ok ? 'Correcto' : 'Incorrecto'}</span>
      </GameHud>
      <div className="relative mx-auto aspect-square w-full max-w-[420px] rounded-2xl border border-white/[.06] bg-ink-900/60">
        {CORSI_POS.map(([x, y], i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            aria-label={`Bloque ${i + 1}`}
            className="absolute h-[16%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-xl border transition-all duration-150"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: lit === i ? C.mem : 'rgba(167,139,250,.12)',
              borderColor: lit === i ? '#ddd6fe' : 'rgba(167,139,250,.3)',
              boxShadow: lit === i ? `0 0 30px ${C.mem}` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const corsi: GameDef = {
  id: 'corsi',
  name: 'Bloques de Corsi',
  domain: 'memoria',
  tagline: 'Memoria de secuencias espaciales.',
  instructions: ['Los bloques se iluminarán en una secuencia.', 'Tócalos en el mismo orden.', 'La secuencia crece si aciertas.'],
  why: 'La tarea de Corsi mide la memoria de trabajo visoespacial, el «cuaderno visoespacial» del modelo de Baddeley. Entrenarla con dificultad adaptativa mantiene la carga justo en tu límite.',
  maxLevel: 10,
  scoreUnit: 'bloques',
  higherBetter: true,
  normalize: (r) => scale(r.score, 3, 9),
  Component: Corsi,
};

// ─────────────────────────── Matriz de memoria visual ───────────────────────────
function Matrix({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const [k, setK] = useState(level + 2);
  const size = clamp(3 + Math.floor((k - 1) / 3), 3, 8);
  const [cells, setCells] = useState<Set<number>>(new Set());
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<'ready' | 'show' | 'input' | 'fb'>('ready');
  const st = useRef({ trials: 0, correct: 0, best: 0, hits: 0, total: 0 });
  const maxTrials = short ? 4 : 10;

  const start = (kk: number) => {
    const sz = clamp(3 + Math.floor((kk - 1) / 3), 3, 8);
    setCells(new Set(sample([...Array(sz * sz).keys()], kk)));
    setPicked(new Set());
    setWrong(new Set());
    setPhase('show');
    setTimeout(() => setPhase('input'), 900 + kk * 160);
  };

  const end = (good: boolean, hits: number) => {
    const s = st.current;
    s.trials++;
    s.hits += hits;
    s.total += k;
    if (good) {
      s.correct++;
      s.best = Math.max(s.best, k);
    }
    feedback(good);
    setPhase('fb');
    setTimeout(() => {
      if (s.trials >= maxTrials) return finish({ score: s.best, accuracy: s.hits / s.total, nextLevel: Math.max(1, s.best - 3), metrics: { trialsOk: s.correct }, summary: `Patrón máximo: ${s.best} casillas` });
      const nk = good ? k + 1 : Math.max(2, k - 1);
      setK(nk);
      start(nk);
    }, 1200);
  };

  const tap = (i: number) => {
    if (phase !== 'input' || picked.has(i) || wrong.has(i)) return;
    if (cells.has(i)) {
      const p = new Set(picked).add(i);
      setPicked(p);
      if (p.size === cells.size) end(wrong.size === 0, p.size - wrong.size);
    } else {
      const w = new Set(wrong).add(i);
      setWrong(w);
      if (w.size >= 2) end(false, picked.size);
    }
  };

  if (phase === 'ready') return <GetReady onDone={() => start(k)} />;
  return (
    <div>
      <GameHud>
        <span>
          Patrón {Math.min(st.current.trials + 1, maxTrials)}/{maxTrials}
        </span>
        <span className="font-mono">
          {k} casillas · {size}×{size}
        </span>
        <span>{phase === 'show' ? 'Memoriza' : phase === 'input' ? `Errores: ${wrong.size}/2` : ''}</span>
      </GameHud>
      <div className="mx-auto grid w-full max-w-[420px] gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}>
        {[...Array(size * size).keys()].map((i) => {
          const show = (phase === 'show' && cells.has(i)) || picked.has(i) || (phase === 'fb' && cells.has(i));
          return (
            <motion.button
              key={`${i}-${size}`}
              onClick={() => tap(i)}
              aria-label={`Casilla ${i + 1}`}
              animate={{ rotateY: show ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              className="aspect-square rounded-lg border"
              style={{
                background: wrong.has(i) ? 'rgba(251,113,133,.5)' : show ? (phase === 'fb' && !picked.has(i) ? 'rgba(167,139,250,.35)' : C.mem) : 'rgba(255,255,255,.05)',
                borderColor: 'rgba(255,255,255,.08)',
                boxShadow: show ? `0 0 18px ${C.mem}66` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export const matrix: GameDef = {
  id: 'matrix',
  name: 'Matriz visual',
  domain: 'memoria',
  tagline: 'Memoriza patrones de casillas iluminadas.',
  instructions: ['Un patrón de casillas se iluminará brevemente.', 'Toca todas las casillas que estaban encendidas.', 'Puedes fallar 1 vez por patrón; con 2 errores el patrón se pierde.'],
  why: 'Retener un patrón completo entrena la memoria visual de corto plazo. Intenta percibir la forma global (una «figura») en vez de casillas sueltas: es chunking visual.',
  maxLevel: 16,
  scoreUnit: 'casillas',
  higherBetter: true,
  normalize: (r) => scale(r.score, 3, 15),
  Component: Matrix,
};

// ─────────────────────────── Cartas por pares ───────────────────────────
const ICONS = [I.Star, I.Heart, I.Moon, I.Sun, I.Cloud, I.Flame, I.Leaf, I.Anchor, I.Bell, I.Bird, I.Camera, I.Crown, I.Diamond, I.Feather, I.Fish, I.Gem, I.Key, I.Music, I.Rocket, I.Snowflake, I.Umbrella, I.Zap];
const COLORS = ['#a78bfa', '#22d3ee', '#fbbf24', '#34d399', '#f472b6', '#fb923c', '#60a5fa', '#a3e635'];

function Pairs({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const pairs = short ? 6 : clamp(4 + level, 5, 18);
  const deck = useMemo(() => {
    const ids = sample([...ICONS.keys()], pairs);
    return shuffle(ids.flatMap((id) => [id, id])).map((id, i) => ({ k: i, id, color: COLORS[id % COLORS.length] }));
  }, [pairs]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [peek, setPeek] = useState(true);
  const t0 = useRef(performance.now());
  const cols = pairs * 2 <= 12 ? 4 : pairs * 2 <= 20 ? 5 : 6;

  useEffect(() => {
    const t = setTimeout(() => {
      setPeek(false);
      t0.current = performance.now();
    }, 1500 + pairs * 120);
    return () => clearTimeout(t);
  }, [pairs]);

  const flip = (i: number) => {
    if (peek || open.length === 2 || open.includes(i) || done.has(deck[i].id)) return;
    const o = [...open, i];
    setOpen(o);
    if (o.length === 2) {
      setMoves((m) => m + 1);
      const match = deck[o[0]].id === deck[o[1]].id;
      setTimeout(() => {
        if (match) {
          feedback(true);
          const d = new Set(done).add(deck[i].id);
          setDone(d);
          if (d.size === pairs) {
            const mv = moves + 1;
            const eff = pairs / mv;
            const secs = (performance.now() - t0.current) / 1000;
            finish({ score: Math.round(eff * 100), accuracy: clamp(eff * 1.35, 0, 1), metrics: { movimientos: mv, segundos: Math.round(secs) }, summary: `${mv} movimientos para ${pairs} pares · ${Math.round(secs)} s` });
          }
        }
        setOpen([]);
      }, match ? 350 : 800);
    }
  };

  return (
    <div>
      <GameHud>
        <span>{peek ? 'Memoriza las posiciones…' : `Pares: ${done.size}/${pairs}`}</span>
        <span className="font-mono">Movimientos: {moves}</span>
      </GameHud>
      <div className="mx-auto grid w-full max-w-[520px] gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {deck.map((c, i) => {
          const up = peek || open.includes(i) || done.has(c.id);
          const Icon = ICONS[c.id];
          return (
            <motion.button key={c.k} onClick={() => flip(i)} aria-label={up ? 'Carta descubierta' : 'Carta oculta'} animate={{ rotateY: up ? 0 : 180 }} transition={{ duration: 0.3 }} className={cx('flex aspect-[3/4] items-center justify-center rounded-xl border', done.has(c.id) ? 'opacity-50' : '')} style={{ background: up ? 'rgba(255,255,255,.06)' : 'linear-gradient(135deg,#2a2150,#13182b)', borderColor: up ? `${c.color}66` : 'rgba(255,255,255,.08)' }}>
              {up && <Icon size={28} color={c.color} />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export const pairsGame: GameDef = {
  id: 'pairs',
  name: 'Cartas por pares',
  domain: 'memoria',
  tagline: 'Encuentra las parejas con el menor número de movimientos.',
  instructions: ['Verás las cartas descubiertas unos segundos.', 'Después, gíralas de dos en dos para encontrar parejas.', 'Puntuación = eficiencia (pares / movimientos).'],
  why: 'Recordar qué hay en cada lugar ejercita la memoria de localización de objetos, la misma que usa el método de loci. Verbalizar «estrella arriba a la izquierda» combina códigos visual y verbal (codificación dual).',
  maxLevel: 14,
  scoreUnit: '% eficiencia',
  higherBetter: true,
  normalize: (r, level) => clamp(r.score * 0.6 + level * 4, 0, 100),
  Component: Pairs,
};
