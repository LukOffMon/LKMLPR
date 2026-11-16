import { useMemo, useRef, useState } from 'react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { chance, clamp, pick, rand, randInt, shuffle } from '../core/rng';
import { C, Choices, NumPad, useFinish } from './kit';
import { GameHud, cx } from '../components/ui';

// ─────────────────────────── Matrices tipo Raven ───────────────────────────
interface Cell { shape: number; count: number; fill: number; rot: number; xor?: number }
type Rule = 'const' | 'prog' | 'dist3';

const polyPts = (sides: number, r: number, rot: number) =>
  [...Array(sides)].map((_, i) => {
    const a = -Math.PI / 2 + (i / sides) * Math.PI * 2 + (rot * Math.PI) / 4;
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(' ');

function Shape({ shape, r, rot, fill, color }: { shape: number; r: number; rot: number; fill: number; color: string }) {
  const f = fill === 2 ? color : fill === 1 ? 'url(#hatch)' : 'none';
  if (shape === 0) return <circle r={r} fill={f} stroke={color} strokeWidth={2} />;
  if (shape === 4) return <g transform={`rotate(${rot * 45})`}><rect x={-r * 0.35} y={-r} width={r * 0.7} height={r * 2} fill={f} stroke={color} strokeWidth={2} /></g>;
  return <polygon points={polyPts([0, 4, 3, 5][shape] || 4, r, rot + (shape === 1 ? 1 : 0))} fill={f} stroke={color} strokeWidth={2} />;
}

const LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-17, 0], [17, 0]],
  3: [[0, -16], [-17, 14], [17, 14]],
  4: [[-16, -16], [16, -16], [-16, 16], [16, 16]],
};

export function CellSvg({ c, size = 84, color = '#e7eaf3' }: { c: Cell | null; size?: number; color?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} className="max-w-full">
      <defs>
        <pattern id="hatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="1.6" />
        </pattern>
      </defs>
      {c === null ? (
        <text x="0" y="12" textAnchor="middle" fontSize="38" fill="#6b7595" fontWeight={700}>?</text>
      ) : c.xor !== undefined ? (
        [...Array(9).keys()].map((i) => <rect key={i} x={-36 + (i % 3) * 25} y={-36 + Math.floor(i / 3) * 25} width={22} height={22} rx={4} fill={(c.xor! >> i) & 1 ? color : 'transparent'} stroke="rgba(255,255,255,.15)" />)
      ) : (
        LAYOUT[c.count].map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <Shape shape={c.shape} r={c.count === 1 ? 26 : 12} rot={c.rot} fill={c.fill} color={color} />
          </g>
        ))
      )}
    </svg>
  );
}

const key = (c: Cell) => (c.xor !== undefined ? `x${c.xor}` : `${c.shape}-${c.count}-${c.fill}-${c.rot}`);

function makeMatrix(level: number): { grid: Cell[]; answer: Cell; options: Cell[] } {
  if (level >= 7 && chance(0.35)) {
    // regla XOR: tercera columna = A xor B
    const grid: Cell[] = [];
    for (let r = 0; r < 3; r++) {
      const a = rand(512), b = rand(512);
      grid.push({ shape: 0, count: 1, fill: 0, rot: 0, xor: a }, { shape: 0, count: 1, fill: 0, rot: 0, xor: b }, { shape: 0, count: 1, fill: 0, rot: 0, xor: a ^ b });
    }
    const answer = grid[8];
    const opts = new Map<string, Cell>([[key(answer), answer]]);
    while (opts.size < 6) {
      const v = answer.xor! ^ (1 << rand(9)) ^ (chance(0.4) ? 1 << rand(9) : 0);
      const c = { ...answer, xor: chance(0.2) ? grid[6].xor! | grid[7].xor! : v };
      opts.set(key(c), c);
    }
    return { grid, answer, options: shuffle([...opts.values()]) };
  }
  const nVar = clamp(Math.ceil(level / 2), 1, 4);
  let attrs: ('shape' | 'count' | 'fill' | 'rot')[] = shuffle(['shape', 'count', 'fill', 'rot'] as const).slice(0, nVar);
  const rotVaries = attrs.includes('rot');
  if (rotVaries) attrs = attrs.filter((a) => a !== 'shape'); // la rotación solo se aprecia en la barra
  const rules: Record<string, Rule> = { shape: 'const', count: 'const', fill: 'const', rot: 'const' };
  for (const a of attrs) rules[a] = a === 'shape' || a === 'fill' ? 'dist3' : pick(['prog', 'dist3'] as Rule[]);
  const ranges = { shape: [0, 4], count: [1, 4], fill: [0, 2], rot: [0, 3] } as const;
  const vals: Record<string, number[][]> = {};
  for (const a of ['shape', 'count', 'fill', 'rot'] as const) {
    const [lo, hi] = ranges[a];
    const m: number[][] = [];
    const rule = rules[a];
    const base = randInt(lo, hi);
    const dist = shuffle([...Array(hi - lo + 1)].map((_, i) => lo + i)).slice(0, 3);
    const shift = chance(0.5) ? 1 : 2;
    const starts = [randInt(1, 2), randInt(1, 2), randInt(1, 2)];
    for (let r = 0; r < 3; r++) {
      const row: number[] = [];
      for (let c = 0; c < 3; c++) {
        if (a === 'shape' && rotVaries) row.push(4);
        else if (a === 'rot' && !rotVaries) row.push(0);
        else if (rule === 'const') row.push(a === 'shape' && attrs.length < 2 ? dist[r] : base);
        else if (rule === 'prog') row.push(a === 'count' ? starts[r] + c : (base + r + c) % 4);
        else row.push(dist[(c + r * shift) % 3]);
      }
      m.push(row);
    }
    vals[a] = m;
  }
  const grid: Cell[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid.push({ shape: vals.shape[r][c], count: vals.count[r][c], fill: vals.fill[r][c], rot: vals.rot[r][c] });
  const answer = grid[8];
  const opts = new Map<string, Cell>([[key(answer), answer]]);
  let guard = 0;
  while (opts.size < 6 && guard++ < 200) {
    const pool = (['shape', 'count', 'fill', 'rot'] as const).filter((x) => x !== 'rot' || rotVaries);
    const a = pick(guard < 40 && attrs.length ? attrs : pool);
    const [lo, hi] = ranges[a];
    const c = { ...answer, [a]: randInt(lo, hi) } as Cell;
    if (a === 'count' && c.count > 4) continue;
    opts.set(key(c), c);
  }
  return { grid, answer, options: shuffle([...opts.values()]) };
}

function Raven({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 4 : 8;
  const [i, setI] = useState(0);
  const items = useMemo(() => [...Array(n)].map((_, k) => makeMatrix(clamp(level + Math.floor(k / 3), 1, 10))), [n, level]);
  const [picked, setPicked] = useState<number | null>(null);
  const correct = useRef(0);
  const t0 = useRef(performance.now());
  const it = items[i];
  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>Matriz {i + 1}/{n}</span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      <div className="mx-auto grid w-full max-w-[330px] grid-cols-3 gap-1.5 rounded-2xl border border-white/[.07] bg-ink-900/60 p-2">
        {it.grid.map((c, k) => (
          <div key={k} className="flex aspect-square items-center justify-center rounded-lg bg-white/[.03]">
            <CellSvg c={k === 8 ? null : c} color={C.rea} />
          </div>
        ))}
      </div>
      <p className="my-3 text-center text-sm text-ink-400">¿Qué figura completa la matriz? Busca reglas por filas.</p>
      <Choices
        cols={3}
        options={it.options}
        disabled={picked !== null}
        state={(o, k) => (picked === null ? null : key(o) === key(it.answer) ? 'ok' : k === picked ? 'bad' : 'dim')}
        render={(o) => <CellSvg c={o} size={64} />}
        onPick={(o, k) => {
          const ok = key(o) === key(it.answer);
          if (ok) correct.current++;
          feedback(ok);
          setPicked(k);
          setTimeout(() => {
            setPicked(null);
            if (i + 1 < n) setI(i + 1);
            else finish({ score: correct.current, accuracy: correct.current / n, metrics: { segundos: Math.round((performance.now() - t0.current) / 1000) }, summary: `${correct.current}/${n} matrices resueltas` });
          }, ok ? 700 : 1600);
        }}
      />
    </div>
  );
}

export const raven: GameDef = {
  id: 'raven',
  name: 'Matrices de razonamiento',
  domain: 'razonamiento',
  tagline: 'Descubre las reglas ocultas en matrices 3×3 (tipo Raven).',
  instructions: ['Cada fila sigue unas reglas: forma, número, relleno u orientación pueden mantenerse, progresar o distribuirse.', 'En niveles altos aparece la regla XOR: la 3.ª casilla combina las dos primeras (lo que aparece en solo una de ellas).', 'Elige la opción que completa la matriz.'],
  why: 'Las matrices progresivas son el test clásico de inteligencia fluida: inducir reglas abstractas en material nuevo. Practicar con reglas variadas y explicitarlas mejora tu estrategia de análisis sistemático (atributo por atributo).',
  maxLevel: 10,
  scoreUnit: 'matrices',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 55 + level * 4.5, 0, 100),
  Component: Raven,
};

// ─────────────────────────── Series numéricas y de figuras ───────────────────────────
interface NumSeries { kind: 'num'; terms: number[]; answer: number; rule: string }
interface FigSeries { kind: 'fig'; terms: { a: number; d: number }[]; answer: { a: number; d: number }; options: { a: number; d: number }[]; rule: string }

function makeSeries(level: number): NumSeries | FigSeries {
  if (chance(0.25)) {
    const step = pick([1, 2, 3]);
    const dStep = level > 4 ? pick([1, -1]) : 0;
    const a0 = rand(8), d0 = randInt(1, 3);
    const terms = [...Array(5)].map((_, i) => ({ a: (a0 + i * step) % 8, d: clamp(d0 + i * dStep, 0, 6) }));
    const answer = { a: (a0 + 5 * step) % 8, d: clamp(d0 + 5 * dStep, 0, 6) };
    const opts = new Map<string, { a: number; d: number }>([[`${answer.a}-${answer.d}`, answer]]);
    while (opts.size < 4) {
      const o = { a: (answer.a + pick([1, 2, 3, 5, 6, 7])) % 8, d: chance(0.5) ? answer.d : clamp(answer.d + pick([-1, 1]), 0, 6) };
      opts.set(`${o.a}-${o.d}`, o);
    }
    return { kind: 'fig', terms, answer, options: shuffle([...opts.values()]), rule: `La aguja gira ${step * 45}° cada vez${dStep ? ' y los puntos cambian de uno en uno' : ''}.` };
  }
  const L = clamp(level, 1, 10);
  const types = ['arit', 'arit', 'geom', 'alt', 'sq', 'diff', 'fib', 'muladd', 'arit2'].slice(0, 3 + L);
  const t = pick(types);
  let terms: number[] = [];
  let rule = '';
  const n = 6;
  if (t === 'arit') {
    const a = randInt(1, 20), d = randInt(2, 4 + L * 2) * (L > 3 && chance(0.3) ? -1 : 1);
    terms = [...Array(n)].map((_, i) => a + i * d);
    rule = `Suma ${d} cada vez.`;
  } else if (t === 'geom') {
    const a = randInt(1, 5), r = randInt(2, 3);
    terms = [...Array(n)].map((_, i) => a * r ** i);
    rule = `Multiplica por ${r}.`;
  } else if (t === 'alt') {
    const a = randInt(1, 10), b = randInt(20, 40), d1 = randInt(2, 5), d2 = -randInt(1, 4);
    terms = [...Array(n)].map((_, i) => (i % 2 ? b + Math.floor(i / 2) * d2 : a + Math.floor(i / 2) * d1));
    rule = `Dos series intercaladas: +${d1} en las posiciones impares y ${d2} en las pares.`;
  } else if (t === 'sq') {
    const s = randInt(1, 5), c = randInt(-3, 5);
    terms = [...Array(n)].map((_, i) => (s + i) ** 2 + c);
    rule = `Cuadrados consecutivos ${c >= 0 ? '+' : ''}${c}.`;
  } else if (t === 'diff') {
    const a = randInt(1, 10), d = randInt(1, 3), dd = randInt(1, 3);
    terms = [a];
    for (let i = 1; i < n; i++) terms.push(terms[i - 1] + d + (i - 1) * dd);
    rule = `Las diferencias crecen de ${dd} en ${dd}.`;
  } else if (t === 'fib') {
    const a = randInt(1, 5), b = randInt(1, 6);
    terms = [a, b];
    while (terms.length < n) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
    rule = 'Cada término es la suma de los dos anteriores.';
  } else if (t === 'muladd') {
    const a = randInt(1, 4), m = 2, c = pick([-1, 1, 2, 3]);
    terms = [a];
    while (terms.length < n) terms.push(terms[terms.length - 1] * m + c);
    rule = `Multiplica por ${m} y suma ${c}.`;
  } else {
    const a = randInt(2, 9);
    const ops = [randInt(2, 6), -randInt(1, 3)];
    terms = [a];
    for (let i = 1; i < n; i++) terms.push(terms[i - 1] + (i % 2 ? ops[0] : ops[1]) * (i % 2 ? 1 : 1));
    terms = terms.map((x, i) => (i % 3 === 2 ? x * 1 : x));
    rule = `Alterna +${ops[0]} y ${ops[1]}.`;
  }
  const answer = terms.pop()!;
  return { kind: 'num', terms, answer, rule };
}

function Clock({ a, d, size = 64 }: { a: number; d: number; size?: number }) {
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size}>
      <circle r={42} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={2} />
      <line x1={0} y1={0} x2={Math.cos(-Math.PI / 2 + (a * Math.PI) / 4) * 34} y2={Math.sin(-Math.PI / 2 + (a * Math.PI) / 4) * 34} stroke={C.rea} strokeWidth={5} strokeLinecap="round" />
      {[...Array(d)].map((_, i) => (
        <circle key={i} cx={-22 + (i % 3) * 22} cy={i < 3 ? 22 : -22} r={4} fill="#e7eaf3" />
      ))}
    </svg>
  );
}

function Series({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 5 : 10;
  const items = useMemo(() => [...Array(n)].map(() => makeSeries(level)), [n, level]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [res, setRes] = useState<null | { ok: boolean; msg: string }>(null);
  const correct = useRef(0);
  const it = items[i];
  const judge = (ok: boolean) => {
    if (res) return;
    if (ok) correct.current++;
    feedback(ok);
    setRes({ ok, msg: (it.kind === 'num' ? `Respuesta: ${it.answer}. ` : '') + it.rule });
    setTimeout(() => {
      setRes(null);
      setVal('');
      if (i + 1 < n) setI(i + 1);
      else finish({ score: correct.current, accuracy: correct.current / n, summary: `${correct.current}/${n} series completadas` });
    }, ok ? 1100 : 2600);
  };
  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>Serie {i + 1}/{n}</span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      {it.kind === 'num' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2 font-mono text-2xl sm:text-3xl">
            {it.terms.map((t, k) => (
              <span key={k} className="rounded-lg bg-white/[.05] px-3 py-1.5 text-ink-100">{t}</span>
            ))}
            <span className="rounded-lg border border-dashed border-rea/60 px-3 py-1.5" style={{ color: C.rea }}>{val || '?'}</span>
          </div>
          <NumPad value={val} onChange={setVal} onSubmit={() => val && val !== '-' && judge(Number(val) === it.answer)} allowMinus disabled={!!res} color={C.rea} />
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {it.terms.map((t, k) => (
              <div key={k} className="rounded-xl bg-white/[.04] p-1"><Clock {...t} /></div>
            ))}
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border border-dashed border-rea/60 text-2xl text-ink-500">?</div>
          </div>
          <Choices cols={4} options={it.options} disabled={!!res} render={(o) => <Clock {...o} size={56} />} onPick={(o) => judge(o.a === it.answer.a && o.d === it.answer.d)} />
        </>
      )}
      {res && <div className={cx('mt-4 rounded-xl p-3 text-center text-sm', res.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200')}>{res.msg}</div>}
    </div>
  );
}

export const series: GameDef = {
  id: 'series',
  name: 'Series lógicas',
  domain: 'razonamiento',
  tagline: 'Encuentra el siguiente término de series numéricas y de figuras.',
  instructions: ['Observa la serie y deduce la regla.', 'Escribe el número que sigue o elige la figura correcta.', 'Tras cada respuesta verás la regla: úsala para aprender patrones.'],
  why: 'Completar series es razonamiento inductivo: generar hipótesis y comprobarlas. Ver la regla explícita tras cada intento convierte el error en aprendizaje y amplía tu repertorio de patrones.',
  maxLevel: 10,
  scoreUnit: 'series',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 55 + level * 4.5, 0, 100),
  Component: Series,
};
