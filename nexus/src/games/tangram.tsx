import { useMemo, useRef, useState } from 'react';
import { FlipHorizontal, RotateCw } from 'lucide-react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { sfx } from '../core/audio';
import { clamp, rand, shuffle } from '../core/rng';
import { useFinish } from './kit';
import { Button, GameHud, useKey } from '../components/ui';

type P = [number, number];
const BASE: { id: string; pts: P[]; color: string }[] = [
  { id: 'big1', pts: [[0, 0], [2, 0], [1, 1]], color: '#60a5fa' },
  { id: 'big2', pts: [[0, 0], [2, 0], [1, 1]], color: '#818cf8' },
  { id: 'med', pts: [[0, 0], [1, 0], [0, 1]], color: '#22d3ee' },
  { id: 'sm1', pts: [[0, 0], [1, 0], [0.5, 0.5]], color: '#34d399' },
  { id: 'sm2', pts: [[0, 0], [1, 0], [0.5, 0.5]], color: '#a3e635' },
  { id: 'sq', pts: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], color: '#fbbf24' },
  { id: 'par', pts: [[0, 0], [1, 0], [1.5, 0.5], [0.5, 0.5]], color: '#f472b6' },
];

interface PieceState { id: string; rot: number; flip: boolean; x: number; y: number }

function shape(id: string, rot: number, flip: boolean): P[] {
  let pts = BASE.find((b) => b.id === id)!.pts.map(([x, y]) => [flip ? -x : x, y] as P);
  for (let i = 0; i < rot; i++) pts = pts.map(([x, y]) => [-y, x] as P);
  const mx = Math.min(...pts.map((p) => p[0])), my = Math.min(...pts.map((p) => p[1]));
  return pts.map(([x, y]) => [x - mx, y - my] as P);
}
const placed = (p: PieceState) => shape(p.id, p.rot, p.flip).map(([x, y]) => [x + p.x, y + p.y] as P);

function inConvex(pts: P[], x: number, y: number) {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    const cr = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (cr === 0) continue;
    const s = Math.sign(cr);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}
const STEP = 0.125;
/** Rasteriza un polígono convexo en una rejilla desplazada (evita muestras sobre las aristas). */
function raster(pts: P[]): Set<string> {
  const out = new Set<string>();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const i0 = Math.floor((Math.min(...xs) - 0.03) / STEP) - 1, i1 = Math.ceil((Math.max(...xs) - 0.03) / STEP) + 1;
  const j0 = Math.floor((Math.min(...ys) - 0.07) / STEP) - 1, j1 = Math.ceil((Math.max(...ys) - 0.07) / STEP) + 1;
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) if (inConvex(pts, 0.03 + i * STEP, 0.07 + j * STEP)) out.add(`${i},${j}`);
  return out;
}

function generate(ids: string[]): PieceState[] {
  for (let attempt = 0; ; attempt++) {
    const order = shuffle(ids);
    const res: PieceState[] = [];
    const union = new Set<string>();
    let fail = false;
    for (const id of order) {
      let ok = false;
      for (let t = 0; t < 250 && !ok; t++) {
        const rot = rand(4), flip = id === 'par' && rand(2) === 1;
        let x = 0, y = 0;
        if (res.length) {
          const all = res.flatMap(placed);
          const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
          const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
          x = minX - 2 + rand(Math.round((maxX - minX + 4) * 2)) * 0.5;
          y = minY - 2 + rand(Math.round((maxY - minY + 4) * 2)) * 0.5;
        }
        const ps: PieceState = { id, rot, flip, x, y };
        const cells = raster(placed(ps));
        if ([...cells].some((c) => union.has(c))) continue;
        if (res.length) {
          let touch = 0;
          for (const c of cells) {
            const [i, j] = c.split(',').map(Number);
            if (union.has(`${i + 1},${j}`) || union.has(`${i - 1},${j}`) || union.has(`${i},${j + 1}`) || union.has(`${i},${j - 1}`)) touch++;
          }
          if (touch < 6) continue;
        }
        cells.forEach((c) => union.add(c));
        res.push(ps);
        ok = true;
      }
      if (!ok) {
        fail = true;
        break;
      }
    }
    if (fail) continue;
    const all = res.flatMap(placed);
    const minX = Math.min(...all.map((p) => p[0])), minY = Math.min(...all.map((p) => p[1]));
    const w = Math.max(...all.map((p) => p[0])) - minX, h = Math.max(...all.map((p) => p[1])) - minY;
    if (w > 6 + attempt / 200 || h > 5.5 + attempt / 300) continue;
    return res.map((p) => ({ ...p, x: p.x - minX, y: p.y - minY }));
  }
}

const BW = 14, BH = 13.5;

function Tangram({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const nPieces = short ? 4 : clamp(level + 3, 4, 7);
  const ids = useMemo(() => {
    const all = BASE.map((b) => b.id);
    return nPieces >= 7 ? all : shuffle(all).slice(0, nPieces);
  }, [nPieces]);
  const target = useMemo(() => generate(ids), [ids]);
  const tb = useMemo(() => {
    const all = target.flatMap(placed);
    const w = Math.max(...all.map((p) => p[0])), h = Math.max(...all.map((p) => p[1]));
    return { ox: Math.round(((BW - w) / 2) * 2) / 2, oy: Math.round(((7 - h) / 2) * 2) / 2 + 0.5, w, h };
  }, [target]);
  const targetCells = useMemo(() => {
    const s = new Set<string>();
    target.forEach((p) => raster(placed({ ...p, x: p.x + tb.ox, y: p.y + tb.oy })).forEach((c) => s.add(c)));
    return s;
  }, [target, tb]);
  const hints = level <= 2;
  const [pieces, setPieces] = useState<PieceState[]>(() =>
    shuffle(ids).map((id, k) => ({ id, rot: rand(4), flip: false, x: 0.5 + (k % 4) * 3.4, y: 8 + Math.floor(k / 4) * 2.7 })),
  );
  const [sel, setSel] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const t0 = useRef(performance.now());
  const [progress, setProgress] = useState(0);

  const toSvg = (e: React.PointerEvent | PointerEvent): P => {
    const pt = svg.current!.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.current!.getScreenCTM()!.inverse();
    const r = pt.matrixTransform(m);
    return [r.x, r.y];
  };
  const evaluate = (ps: PieceState[]) => {
    const u = new Set<string>();
    let overlap = 0;
    ps.forEach((p) => raster(placed(p)).forEach((c) => (u.has(c) ? overlap++ : u.add(c))));
    let inter = 0;
    u.forEach((c) => targetCells.has(c) && inter++);
    const miss = targetCells.size - inter + (u.size - inter);
    setProgress(inter / targetCells.size);
    if (miss <= targetCells.size * 0.02 && overlap <= targetCells.size * 0.02) {
      feedback(true);
      const secs = (performance.now() - t0.current) / 1000;
      const expected = 40 + nPieces * 15;
      finish({ score: Math.round(secs), accuracy: clamp(expected / secs, 0.4, 1), metrics: { piezas: nPieces }, summary: `Silueta de ${nPieces} piezas en ${Math.round(secs)} s` });
    }
  };
  const update = (id: string, fn: (p: PieceState) => PieceState, check = true) => {
    setPieces((ps) => {
      const nx = ps.map((p) => (p.id === id ? fn(p) : p));
      if (check) evaluate(nx);
      return nx;
    });
  };
  const rotate = (id = sel) => {
    if (!id) return;
    sfx.click();
    update(id, (p) => {
      const before = shape(p.id, p.rot, p.flip), after = shape(p.id, (p.rot + 1) % 4, p.flip);
      const cx = (Math.max(...before.map((q) => q[0])) - Math.max(...after.map((q) => q[0]))) / 2;
      const cy = (Math.max(...before.map((q) => q[1])) - Math.max(...after.map((q) => q[1]))) / 2;
      return { ...p, rot: (p.rot + 1) % 4, x: Math.round((p.x + cx) * 2) / 2, y: Math.round((p.y + cy) * 2) / 2 };
    });
  };
  const flip = (id = sel) => {
    if (!id || id !== 'par') return;
    sfx.click();
    update(id, (p) => ({ ...p, flip: !p.flip }));
  };
  useKey((e) => {
    if (e.key === 'r' || e.key === 'R') rotate();
    if (e.key === 'f' || e.key === 'F') flip();
  }, [sel]);

  return (
    <div className="mx-auto max-w-2xl">
      <GameHud>
        <span>{nPieces} piezas · cubierto {Math.round(progress * 100)} %</span>
        <div className="flex gap-1.5">
          <Button size="sm" icon={<RotateCw size={14} />} onClick={() => rotate()} disabled={!sel}>Girar (R)</Button>
          <Button size="sm" icon={<FlipHorizontal size={14} />} onClick={() => flip()} disabled={sel !== 'par'}>Voltear (F)</Button>
        </div>
      </GameHud>
      <svg
        ref={svg}
        viewBox={`0 0 ${BW} ${BH}`}
        className="w-full touch-none select-none rounded-2xl border border-white/[.07] bg-ink-900/70"
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const [x, y] = toSvg(e);
          d.moved = true;
          update(d.id, (p) => ({ ...p, x: clamp(x - d.dx, -0.5, BW - 1), y: clamp(y - d.dy, -0.5, BH - 1) }), false);
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (!d.moved) return;
          sfx.tick();
          update(d.id, (p) => ({ ...p, x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 }));
        }}
      >
        <rect x={0} y={7.6} width={BW} height={BH - 7.6} fill="rgba(255,255,255,.02)" />
        <g transform={`translate(${tb.ox},${tb.oy})`}>
          {target.map((p) => (
            <polygon key={p.id} points={placed(p).map((q) => q.join(',')).join(' ')} fill="rgba(148,163,210,.22)" stroke={hints ? 'rgba(231,234,243,.35)' : 'rgba(148,163,210,.22)'} strokeWidth={hints ? 0.03 : 0.04} strokeDasharray={hints ? '0.1 0.08' : undefined} />
          ))}
        </g>
        {pieces.map((p) => {
          const b = BASE.find((x) => x.id === p.id)!;
          return (
            <polygon
              key={p.id}
              points={placed(p).map((q) => q.join(',')).join(' ')}
              fill={b.color}
              fillOpacity={0.88}
              stroke={sel === p.id ? '#fff' : '#05070d'}
              strokeWidth={sel === p.id ? 0.06 : 0.03}
              className="cursor-grab"
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                const [x, y] = toSvg(e);
                drag.current = { id: p.id, dx: x - p.x, dy: y - p.y, moved: false };
                setSel(p.id);
                setPieces((ps) => [...ps.filter((q) => q.id !== p.id), ps.find((q) => q.id === p.id)!]);
              }}
              onDoubleClick={() => rotate(p.id)}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
        <span>Arrastra las piezas sobre la silueta · doble clic o R para girar</span>
        <Button size="sm" variant="ghost" onClick={() => finish({ score: Math.round((performance.now() - t0.current) / 1000) + 600, accuracy: progress * 0.5, summary: `Tangram abandonado (${Math.round(progress * 100)} % cubierto)` })}>Rendirse</Button>
      </div>
    </div>
  );
}

export const tangram: GameDef = {
  id: 'tangram',
  name: 'Tangram',
  domain: 'espacial',
  tagline: 'Compón siluetas con las siete piezas clásicas.',
  instructions: ['Arrastra las piezas desde la bandeja hasta cubrir exactamente la silueta.', 'Selecciona una pieza y pulsa «Girar» (R) para rotarla 90°; el paralelogramo también se puede voltear (F).', 'En los primeros niveles se usan menos piezas y la silueta muestra sus contornos.'],
  why: 'El Tangram entrena la descomposición y composición de formas: imaginar cómo encajan piezas rotadas en un contorno. Es razonamiento visoespacial con ensayo y error guiado.',
  keys: 'R girar · F voltear',
  maxLevel: 8,
  scoreUnit: 's',
  higherBetter: false,
  normalize: (r, level) => clamp(r.accuracy * 50 + level * 6, 0, 100),
  Component: Tangram,
  minutes: 5,
};

