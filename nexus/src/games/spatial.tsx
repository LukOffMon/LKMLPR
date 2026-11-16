import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { chance, clamp, pick, rand, shuffle } from '../core/rng';
import { C, Choices, useFinish } from './kit';
import { GameHud, Kbd, Pill, cx, useKey } from '../components/ui';
import { useStore } from '../core/store';
import { isUnlocked } from '../core/skills';
import { sfx } from '../core/audio';

// ─────────────────────────── Rotación mental ───────────────────────────
type V3 = [number, number, number];
function polyomino(k: number): [number, number][] {
  const cells: [number, number][] = [[0, 0]];
  while (cells.length < k) {
    const [x, y] = pick(cells);
    const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (!cells.some(([a, b]) => a === x + dx && b === y + dy)) cells.push([x + dx, y + dy]);
  }
  return cells;
}
function isSymmetric(cells: [number, number][]) {
  // si la figura espejada coincide con alguna rotación, la pregunta sería ambigua
  const norm = (cs: [number, number][]) => {
    const mx = Math.min(...cs.map((c) => c[0])), my = Math.min(...cs.map((c) => c[1]));
    return cs.map(([x, y]) => `${x - mx},${y - my}`).sort().join('|');
  };
  const mir = cells.map(([x, y]) => [-x, y] as [number, number]);
  let r = mir;
  for (let i = 0; i < 4; i++) {
    if (norm(r) === norm(cells)) return true;
    r = r.map(([x, y]) => [-y, x] as [number, number]);
  }
  return false;
}

function Poly2D({ cells, rot, mirror, color }: { cells: [number, number][]; rot: number; mirror: boolean; color: string }) {
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2, cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
  return (
    <svg viewBox="-5 -5 10 10" className="h-full w-full">
      <g transform={`rotate(${rot}) scale(${mirror ? -1 : 1},1)`}>
        {cells.map(([x, y], i) => (
          <rect key={i} x={x - cx} y={y - cy} width={1} height={1} fill={color} fillOpacity={0.85} stroke="#05070d" strokeWidth={0.08} />
        ))}
      </g>
    </svg>
  );
}

function polycube(): V3[] {
  for (;;) {
    const cubes: V3[] = [[0, 0, 0]];
    const dirs: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]];
    let pos: V3 = [0, 0, 0];
    let last: V3 | null = null;
    const arms = [2, 3, 2, 2];
    let ok = true;
    for (const len of arms) {
      const d = pick(dirs.filter((x) => !last || (x[0] * last[0] + x[1] * last[1] + x[2] * last[2] === 0)));
      for (let i = 0; i < len; i++) {
        pos = [pos[0] + d[0], pos[1] + d[1], pos[2] + d[2]];
        if (cubes.some((c) => c[0] === pos[0] && c[1] === pos[1] && c[2] === pos[2])) ok = false;
        cubes.push(pos);
      }
      last = d;
    }
    if (ok) return cubes;
  }
}
const rotM = (ax: number, ay: number, az: number) => {
  const [a, b, c] = [ax, ay, az].map((x) => (x * Math.PI) / 180);
  const Rx = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const Ry = [[Math.cos(b), 0, Math.sin(b)], [0, 1, 0], [-Math.sin(b), 0, Math.cos(b)]];
  const Rz = [[Math.cos(c), -Math.sin(c), 0], [Math.sin(c), Math.cos(c), 0], [0, 0, 1]];
  const mul = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, _, k) => s + r[k] * B[k][j], 0)));
  return mul(Rz, mul(Ry, Rx));
};
const apply = (M: number[][], v: V3): V3 => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];

function Cubes3D({ cubes, M, color }: { cubes: V3[]; M: number[][]; color: string }) {
  const view = rotM(-28, 38, 0);
  const center = [0, 1, 2].map((i) => cubes.reduce((s, c) => s + c[i], 0) / cubes.length) as V3;
  const faces: { pts: string; z: number; shade: number }[] = [];
  const F: { n: V3; v: V3[] }[] = [
    { n: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { n: [0, 1, 0], v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
    { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
  ];
  const T = (p: V3) => apply(view, apply(M, [p[0] - center[0] - 0.5, p[1] - center[1] - 0.5, p[2] - center[2] - 0.5]));
  for (const c of cubes)
    for (const f of F) {
      const nb: V3 = [c[0] + f.n[0], c[1] + f.n[1], c[2] + f.n[2]];
      if (cubes.some((d) => d[0] === nb[0] && d[1] === nb[1] && d[2] === nb[2])) continue; // cara interna
      const n = apply(view, apply(M, f.n));
      if (n[2] <= 0.01) continue;
      const pts = f.v.map((v) => T([c[0] + v[0], c[1] + v[1], c[2] + v[2]]));
      const z = pts.reduce((s, p) => s + p[2], 0) / 4;
      faces.push({ pts: pts.map((p) => `${p[0]},${-p[1]}`).join(' '), z, shade: 0.45 + 0.55 * Math.max(0, n[2] * 0.6 + n[1] * 0.4 + 0.2) });
    }
  faces.sort((a, b) => a.z - b.z);
  return (
    <svg viewBox="-6 -6 12 12" className="h-full w-full">
      {faces.map((f, i) => (
        <polygon key={i} points={f.pts} fill={color} fillOpacity={f.shade} stroke="#05070d" strokeWidth={0.06} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function Rotation({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const can3d = useStore((s) => isUnlocked(s, 'rot3d'));
  const [mode, setMode] = useState<null | '2d' | '3d'>(short || !can3d ? '2d' : null);
  const n = short ? 8 : 16;
  const trials = useMemo(
    () =>
      [...Array(n)].map(() => {
        const mirror = chance(0.5);
        if (mode === '3d') {
          const cubes = polycube();
          const maxA = clamp(40 + level * 15, 40, 180);
          return { kind: '3d' as const, cubes, mirror, a: [rand(360), rand(maxA), rand(maxA)] as V3, b: [0, 0, 0] as V3 };
        }
        let cells: [number, number][];
        do cells = polyomino(clamp(4 + Math.floor(level / 2), 4, 9));
        while (isSymmetric(cells));
        const maxA = clamp(60 + level * 30, 60, 330);
        return { kind: '2d' as const, cells, mirror, rotA: rand(360), rotB: rand(360) + (rand(maxA) + 30) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, n],
  );
  const [i, setI] = useState(0);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const correct = useRef(0);
  const rts = useRef<number[]>([]);
  const t0 = useRef(performance.now());
  const answer = (sayMirror: boolean) => {
    if (fb || !mode) return;
    const ok = sayMirror === trials[i].mirror;
    if (ok) {
      correct.current++;
      rts.current.push(performance.now() - t0.current);
    }
    feedback(ok);
    setFb(ok ? 'ok' : 'bad');
    setTimeout(() => {
      setFb(null);
      t0.current = performance.now();
      if (i + 1 < n) setI(i + 1);
      else {
        const rt = rts.current.length ? Math.round(rts.current.reduce((a, b) => a + b, 0) / rts.current.length) : 0;
        finish({ score: correct.current, accuracy: correct.current / n, metrics: { tiempoMedio: rt, modo: mode === '3d' ? 3 : 2 }, summary: `${correct.current}/${n} correctas (${mode.toUpperCase()}) · ${(rt / 1000).toFixed(1)} s de media` });
      }
    }, 600);
  };
  useKey((e) => {
    if (e.key === 'ArrowLeft' || e.key === 'i' || e.key === 'I') answer(false);
    if (e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E') answer(true);
  }, [i, fb, mode]);
  if (!mode)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setMode('2d')} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-left hover:border-spa/50">
          <div className="font-display text-lg font-semibold">Figuras 2D</div>
          <div className="text-sm text-ink-400">Poliominós rotados en el plano.</div>
        </button>
        <button onClick={() => setMode('3d')} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-left hover:border-spa/50">
          <div className="font-display text-lg font-semibold">Cubos 3D</div>
          <div className="text-sm text-ink-400">Figuras de Shepard-Metzler rotadas en el espacio.</div>
        </button>
      </div>
    );
  const t = trials[i];
  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span>{mode === '3d' ? <Pill color={C.spa}>3D</Pill> : <Pill color={C.spa}>2D</Pill>}</span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      <div className={cx('grid grid-cols-2 gap-3 rounded-2xl border p-3 transition', fb === 'ok' ? 'border-emerald-400/50' : fb === 'bad' ? 'border-rose-400/50' : 'border-white/[.07]')}>
        {[0, 1].map((side) => (
          <div key={side} className="aspect-square rounded-xl bg-ink-900/70 p-2">
            {t.kind === '2d' ? (
              <Poly2D cells={t.cells} rot={side ? t.rotB : t.rotA} mirror={side === 1 && t.mirror} color={C.spa} />
            ) : (
              <Cubes3D cubes={side && t.mirror ? t.cubes.map(([x, y, z]) => [-x, y, z] as V3) : t.cubes} M={side ? rotM(t.a[0], t.a[1], t.a[2]) : rotM(0, 0, 0)} color={C.spa} />
            )}
          </div>
        ))}
      </div>
      <p className="my-3 text-center text-sm text-ink-400">¿La figura de la derecha es la misma rotada o su imagen especular?</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => answer(false)} className="h-14 rounded-xl border border-white/10 bg-white/[.05] font-semibold active:scale-95">Igual <Kbd>←</Kbd></button>
        <button onClick={() => answer(true)} className="h-14 rounded-xl border border-white/10 bg-white/[.05] font-semibold active:scale-95">Espejo <Kbd>→</Kbd></button>
      </div>
    </div>
  );
}

export const rotation: GameDef = {
  id: 'rotation',
  name: 'Rotación mental',
  domain: 'espacial',
  tagline: '¿Misma figura rotada o su reflejo?',
  instructions: ['Compara las dos figuras.', 'Decide si la de la derecha es la misma figura girada («Igual») o su imagen en espejo («Espejo»).', 'Los ángulos aumentan con el nivel. El modo 3D se desbloquea en el árbol de habilidades.'],
  why: 'Shepard y Metzler (1971) demostraron que el tiempo para responder crece con el ángulo: rotamos las imágenes mentalmente como objetos reales. Es de las habilidades espaciales que más mejoran con la práctica.',
  keys: '← igual · → espejo',
  maxLevel: 10,
  scoreUnit: 'aciertos',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 55 + level * 4 + (r.metrics?.modo === 3 ? 8 : 0), 0, 100),
  Component: Rotation,
};

// ─────────────────────────── Plegado de papel ───────────────────────────
type Fold = 'L' | 'R' | 'T' | 'B'; // L: izquierda sobre derecha, etc.
interface Region { x0: number; x1: number; y0: number; y1: number }
const G = 4;

function foldRegions(folds: Fold[]) {
  const regs: Region[] = [{ x0: 0, x1: G, y0: 0, y1: G }];
  const lines: { axis: 'x' | 'y'; at: number }[] = [];
  for (const f of folds) {
    const r = { ...regs[regs.length - 1] };
    if (f === 'L' || f === 'R') {
      const m = (r.x0 + r.x1) / 2;
      lines.push({ axis: 'x', at: m });
      if (f === 'L') r.x0 = m; else r.x1 = m;
    } else {
      const m = (r.y0 + r.y1) / 2;
      lines.push({ axis: 'y', at: m });
      if (f === 'T') r.y0 = m; else r.y1 = m;
    }
    regs.push(r);
  }
  return { regs, lines };
}
function unfold(holes: [number, number][], lines: { axis: 'x' | 'y'; at: number }[], skipLast = false, wrongAxis = false) {
  let hs = holes.slice();
  const ls = lines.slice().reverse();
  ls.forEach((l, i) => {
    if (skipLast && i === 0) return;
    const axis = wrongAxis && i === 0 ? (l.axis === 'x' ? 'y' : 'x') : l.axis;
    const at = wrongAxis && i === 0 ? G / 2 : l.at;
    hs = [...hs, ...hs.map(([x, y]) => (axis === 'x' ? [2 * at - x - 1, y] : [x, 2 * at - y - 1]) as [number, number])];
  });
  const key = new Set(hs.filter(([x, y]) => x >= 0 && y >= 0 && x < G && y < G).map(([x, y]) => `${x},${y}`));
  return [...key].sort();
}

function Paper({ reg, hole, fold, holes, size = 92 }: { reg?: Region; hole?: [number, number][]; fold?: Fold; holes?: string[]; size?: number }) {
  const u = 100 / G;
  return (
    <svg viewBox="-4 -4 108 108" width={size} height={size}>
      <rect x={0} y={0} width={100} height={100} fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.12)" strokeDasharray="2 2" />
      {reg && <rect x={reg.x0 * u} y={reg.y0 * u} width={(reg.x1 - reg.x0) * u} height={(reg.y1 - reg.y0) * u} fill="rgba(96,165,250,.18)" stroke={C.spa} strokeWidth={1.5} />}
      {reg && fold && (() => {
        const mx = ((reg.x0 + reg.x1) / 2) * u, my = ((reg.y0 + reg.y1) / 2) * u;
        const p = { L: `M${reg.x0 * u + 6},${my} Q${mx},${my - 22} ${mx + 18},${my}`, R: `M${reg.x1 * u - 6},${my} Q${mx},${my - 22} ${mx - 18},${my}`, T: `M${mx},${reg.y0 * u + 6} Q${mx + 22},${my} ${mx},${my + 18}`, B: `M${mx},${reg.y1 * u - 6} Q${mx + 22},${my} ${mx},${my - 18}` }[fold];
        const line = fold === 'L' || fold === 'R' ? <line x1={mx} y1={reg.y0 * u} x2={mx} y2={reg.y1 * u} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 3" /> : <line x1={reg.x0 * u} y1={my} x2={reg.x1 * u} y2={my} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 3" />;
        return (
          <g>
            {line}
            <path d={p} fill="none" stroke="#fbbf24" strokeWidth={2} markerEnd="url(#arr)" />
          </g>
        );
      })()}
      {hole?.map(([x, y], i) => <circle key={i} cx={(x + 0.5) * u} cy={(y + 0.5) * u} r={6} fill="#05070d" stroke="#e7eaf3" strokeWidth={1.5} />)}
      {holes?.map((h) => {
        const [x, y] = h.split(',').map(Number);
        return <circle key={h} cx={(x + 0.5) * u} cy={(y + 0.5) * u} r={6} fill="#05070d" stroke={C.spa} strokeWidth={1.5} />;
      })}
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#fbbf24" />
        </marker>
      </defs>
    </svg>
  );
}

function makeFold(level: number) {
  const nf = level <= 2 ? 1 : level <= 5 ? 2 : 3;
  const folds: Fold[] = [];
  let xs = 0, ys = 0;
  while (folds.length < nf) {
    const f = pick(['L', 'R', 'T', 'B'] as Fold[]);
    if ((f === 'L' || f === 'R') && xs >= 2) continue;
    if ((f === 'T' || f === 'B') && ys >= 2) continue;
    if (f === 'L' || f === 'R') xs++; else ys++;
    folds.push(f);
  }
  const { regs, lines } = foldRegions(folds);
  const fin = regs[regs.length - 1];
  const nh = level >= 4 && chance(0.5) ? 2 : 1;
  const holes: [number, number][] = [];
  while (holes.length < nh) {
    const h: [number, number] = [fin.x0 + rand(fin.x1 - fin.x0), fin.y0 + rand(fin.y1 - fin.y0)];
    if (!holes.some((x) => x[0] === h[0] && x[1] === h[1])) holes.push(h);
  }
  const right = unfold(holes, lines);
  const opts = new Map<string, string[]>([[right.join(';'), right]]);
  const cands = [unfold(holes, lines, true), unfold(holes, lines, false, true), right.map((h) => { const [x, y] = h.split(',').map(Number); return `${G - 1 - x},${y}`; }), right.map((h) => { const [x, y] = h.split(',').map(Number); return `${x},${G - 1 - y}`; }), right.slice(1)];
  for (const c of shuffle(cands)) if (c.length && opts.size < 4) opts.set(c.slice().sort().join(';'), c.slice().sort());
  let guard = 0;
  while (opts.size < 4 && guard++ < 50) {
    const c = right.map((h) => { const [x, y] = h.split(',').map(Number); return `${clamp(x + pick([-1, 0, 1]), 0, G - 1)},${clamp(y + pick([-1, 0, 1]), 0, G - 1)}`; });
    const u = [...new Set(c)].sort();
    opts.set(u.join(';'), u);
  }
  return { regs, folds, holes, right: right.join(';'), options: shuffle([...opts.values()]) };
}

function PaperFold({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 4 : 10;
  const items = useMemo(() => [...Array(n)].map(() => makeFold(level)), [n, level]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const correct = useRef(0);
  const it = items[i];
  return (
    <div className="mx-auto max-w-2xl">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {it.folds.map((f, k) => (
          <div key={k} className="rounded-xl bg-ink-900/70 p-1.5 text-center">
            <Paper reg={it.regs[k]} fold={f} />
            <div className="text-[10px] text-ink-500">Pliegue {k + 1}</div>
          </div>
        ))}
        <div className="rounded-xl bg-ink-900/70 p-1.5 text-center">
          <Paper reg={it.regs[it.regs.length - 1]} hole={it.holes} />
          <div className="text-[10px] text-ink-500">Perforación</div>
        </div>
      </div>
      <p className="mb-3 text-center text-sm text-ink-400">El papel se pliega como indican las flechas y se perfora. ¿Cómo queda al desplegarlo?</p>
      <Choices
        cols={4}
        options={it.options}
        disabled={picked !== null}
        state={(o, k) => (picked === null ? null : o.slice().sort().join(';') === it.right ? 'ok' : k === picked ? 'bad' : 'dim')}
        render={(o) => <Paper holes={o} size={72} />}
        onPick={(o, k) => {
          const ok = o.slice().sort().join(';') === it.right;
          if (ok) correct.current++;
          feedback(ok);
          setPicked(k);
          setTimeout(() => {
            setPicked(null);
            if (i + 1 < n) setI(i + 1);
            else finish({ score: correct.current, accuracy: correct.current / n, summary: `${correct.current}/${n} despliegues correctos` });
          }, ok ? 700 : 1600);
        }}
      />
    </div>
  );
}

export const paperfold: GameDef = {
  id: 'paperfold',
  name: 'Plegado de papel',
  domain: 'espacial',
  tagline: 'Visualiza dónde aparecerán los agujeros al desplegar.',
  instructions: ['Una hoja se pliega por la mitad una o varias veces (flechas ámbar).', 'Después se perfora la zona plegada.', 'Elige cómo quedan los agujeros al desplegarla.'],
  why: 'La prueba de plegado de papel mide la visualización espacial: manipular mentalmente varios pasos de transformación. Cada pliegue duplica los agujeros por simetría; razonar en orden inverso es la estrategia clave.',
  maxLevel: 8,
  scoreUnit: 'aciertos',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 55 + level * 5.5, 0, 100),
  Component: PaperFold,
};

// ─────────────────────────── Laberinto contrarreloj ───────────────────────────
function makeMaze(w: number, h: number) {
  // walls[y][x] = bits: 1 N, 2 E, 4 S, 8 W
  const walls = [...Array(h)].map(() => Array(w).fill(15));
  const seen = [...Array(h)].map(() => Array(w).fill(false));
  const stack: [number, number][] = [[0, 0]];
  seen[0][0] = true;
  const D = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = D.filter(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < w && y + dy < h && !seen[y + dy][x + dx]);
    if (!nb.length) {
      stack.pop();
      continue;
    }
    const [dx, dy, b, ob] = pick(nb);
    walls[y][x] &= ~b;
    walls[y + dy][x + dx] &= ~ob;
    seen[y + dy][x + dx] = true;
    stack.push([x + dx, y + dy]);
  }
  return walls;
}

function Maze({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const size = short ? 8 : clamp(6 + level * 2, 8, 30);
  const walls = useMemo(() => makeMaze(size, size), [size]);
  const [p, setP] = useState<[number, number]>([0, 0]);
  const [trail, setTrail] = useState<string[]>(['0,0']);
  const t0 = useRef(performance.now());
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((performance.now() - t0.current) / 1000), 200);
    return () => clearInterval(id);
  }, []);
  const expected = size * size * 0.09 + 4;
  const move = (dx: number, dy: number) => {
    setP(([x, y]) => {
      const bit = dx === 1 ? 2 : dx === -1 ? 8 : dy === 1 ? 4 : 1;
      if (walls[y][x] & bit) return [x, y];
      const nx = x + dx, ny = y + dy;
      sfx.tick();
      setTrail((t) => [...t, `${nx},${ny}`]);
      if (nx === size - 1 && ny === size - 1) {
        const s = (performance.now() - t0.current) / 1000;
        feedback(true);
        finish({ score: Math.round(s * 10) / 10, accuracy: clamp(expected / s, 0.3, 1), metrics: { tamaño: size, pasos: trail.length }, summary: `Laberinto ${size}×${size} en ${s.toFixed(1)} s` });
      }
      return [nx, ny];
    });
  };
  useKey((e) => {
    const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    if (e.key in m) {
      e.preventDefault();
      move(...m[e.key]);
    }
  }, []);
  const touch = useRef<[number, number] | null>(null);
  const cell = 100 / size;
  const trailSet = new Set(trail);
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span className="font-mono">{secs.toFixed(1)} s</span>
        <span>{size}×{size} · objetivo en {Math.round(expected)} s</span>
      </GameHud>
      <div
        className="touch-none"
        onTouchStart={(e) => (touch.current = [e.touches[0].clientX, e.touches[0].clientY])}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current[0], dy = e.changedTouches[0].clientY - touch.current[1];
          if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) Math.abs(dx) > Math.abs(dy) ? move(Math.sign(dx), 0) : move(0, Math.sign(dy));
          touch.current = null;
        }}
      >
        <svg viewBox="-1 -1 102 102" className="w-full rounded-xl bg-ink-900/70">
          {walls.flatMap((row, y) =>
            row.map((wv, x) => (
              <g key={`${x}-${y}`} stroke="rgba(96,165,250,.7)" strokeWidth={size > 20 ? 0.35 : 0.6} strokeLinecap="round">
                {trailSet.has(`${x},${y}`) && <rect x={x * cell + cell * 0.3} y={y * cell + cell * 0.3} width={cell * 0.4} height={cell * 0.4} fill="rgba(96,165,250,.25)" stroke="none" />}
                {wv & 1 ? <line x1={x * cell} y1={y * cell} x2={(x + 1) * cell} y2={y * cell} /> : null}
                {wv & 8 ? <line x1={x * cell} y1={y * cell} x2={x * cell} y2={(y + 1) * cell} /> : null}
                {y === size - 1 && wv & 4 ? <line x1={x * cell} y1={(y + 1) * cell} x2={(x + 1) * cell} y2={(y + 1) * cell} /> : null}
                {x === size - 1 && wv & 2 ? <line x1={(x + 1) * cell} y1={y * cell} x2={(x + 1) * cell} y2={(y + 1) * cell} /> : null}
              </g>
            )),
          )}
          <rect x={(size - 1) * cell + cell * 0.15} y={(size - 1) * cell + cell * 0.15} width={cell * 0.7} height={cell * 0.7} rx={cell * 0.15} fill="#34d399" />
          <motion.circle initial={false} cx={p[0] * cell + cell / 2} cy={p[1] * cell + cell / 2} animate={{ cx: p[0] * cell + cell / 2, cy: p[1] * cell + cell / 2 }} transition={{ duration: 0.08 }} r={cell * 0.32} fill="#fbbf24" />
        </svg>
      </div>
      <div className="mx-auto mt-3 grid w-40 grid-cols-3 gap-1.5 sm:hidden">
        <div />
        <button className="flex h-12 items-center justify-center rounded-xl bg-white/[.07]" onClick={() => move(0, -1)} aria-label="Arriba"><ArrowUp size={18} /></button>
        <div />
        <button className="flex h-12 items-center justify-center rounded-xl bg-white/[.07]" onClick={() => move(-1, 0)} aria-label="Izquierda"><ArrowLeft size={18} /></button>
        <button className="flex h-12 items-center justify-center rounded-xl bg-white/[.07]" onClick={() => move(0, 1)} aria-label="Abajo"><ArrowDown size={18} /></button>
        <button className="flex h-12 items-center justify-center rounded-xl bg-white/[.07]" onClick={() => move(1, 0)} aria-label="Derecha"><ArrowRight size={18} /></button>
      </div>
      <p className="mt-2 text-center text-xs text-ink-500">Flechas o WASD · desliza en móvil · llega al cuadrado verde</p>
    </div>
  );
}

export const maze: GameDef = {
  id: 'maze',
  name: 'Laberintos',
  domain: 'espacial',
  tagline: 'Encuentra la salida contrarreloj.',
  instructions: ['Lleva el punto ámbar hasta el cuadrado verde.', 'Usa flechas, WASD, deslizamientos o los botones.', 'El laberinto crece con el nivel; intenta superar el tiempo objetivo.'],
  why: 'Resolver laberintos combina planificación espacial, exploración visual por delante del movimiento y memoria de los caminos ya descartados.',
  keys: 'Flechas · WASD',
  maxLevel: 12,
  scoreUnit: 's',
  higherBetter: false,
  normalize: (r, level) => clamp(r.accuracy * 50 + level * 4.5, 0, 100),
  Component: Maze,
};

