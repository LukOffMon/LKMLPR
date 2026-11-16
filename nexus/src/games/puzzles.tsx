import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Pencil, X as XIcon, Square } from 'lucide-react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { sfx } from '../core/audio';
import { chance, clamp, scale, shuffle } from '../core/rng';
import { C, useFinish } from './kit';
import { Button, GameHud, cx, useKey } from '../components/ui';

function useElapsed() {
  const t0 = useRef(performance.now());
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setS(Math.floor((performance.now() - t0.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);
  return { s, get: () => (performance.now() - t0.current) / 1000 };
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ─────────────────────────── Sudoku ───────────────────────────
function countSolutions(g: number[], limit = 2): number {
  const i = g.indexOf(0);
  if (i < 0) return 1;
  const r = Math.floor(i / 9), c = i % 9;
  let used = 0;
  for (let k = 0; k < 9; k++) {
    used |= 1 << g[r * 9 + k];
    used |= 1 << g[k * 9 + c];
    const br = Math.floor(r / 3) * 3 + Math.floor(k / 3), bc = Math.floor(c / 3) * 3 + (k % 3);
    used |= 1 << g[br * 9 + bc];
  }
  let n = 0;
  for (let d = 1; d <= 9 && n < limit; d++) {
    if (used & (1 << d)) continue;
    g[i] = d;
    n += countSolutions(g, limit - n);
  }
  g[i] = 0;
  return n;
}
function fillGrid(g: number[]): boolean {
  const i = g.indexOf(0);
  if (i < 0) return true;
  const r = Math.floor(i / 9), c = i % 9;
  for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    let ok = true;
    for (let k = 0; k < 9 && ok; k++) {
      const br = Math.floor(r / 3) * 3 + Math.floor(k / 3), bc = Math.floor(c / 3) * 3 + (k % 3);
      if (g[r * 9 + k] === d || g[k * 9 + c] === d || g[br * 9 + bc] === d) ok = false;
    }
    if (!ok) continue;
    g[i] = d;
    if (fillGrid(g)) return true;
  }
  g[i] = 0;
  return false;
}
export function makeSudoku(givens: number) {
  const sol = Array(81).fill(0);
  fillGrid(sol);
  const puz = sol.slice();
  let filled = 81;
  for (const i of shuffle([...Array(81).keys()])) {
    if (filled <= givens) break;
    const v = puz[i];
    puz[i] = 0;
    if (countSolutions(puz.slice()) !== 1) puz[i] = v;
    else filled--;
  }
  return { sol, puz };
}

function Sudoku({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const givens = short ? 52 : clamp(50 - level * 3, 24, 50);
  const { sol, puz } = useMemo(() => makeSudoku(givens), [givens]);
  const [grid, setGrid] = useState<number[]>(puz);
  const [notes, setNotes] = useState<number[]>(Array(81).fill(0));
  const [sel, setSel] = useState(puz.indexOf(0));
  const [noteMode, setNoteMode] = useState(false);
  const mistakes = useRef(0);
  const time = useElapsed();
  const conflicts = useMemo(() => {
    const bad = new Set<number>();
    for (let i = 0; i < 81; i++) {
      if (!grid[i]) continue;
      const r = Math.floor(i / 9), c = i % 9;
      for (let j = 0; j < 81; j++) {
        if (i === j || grid[j] !== grid[i]) continue;
        const r2 = Math.floor(j / 9), c2 = j % 9;
        if (r === r2 || c === c2 || (Math.floor(r / 3) === Math.floor(r2 / 3) && Math.floor(c / 3) === Math.floor(c2 / 3))) bad.add(i);
      }
    }
    return bad;
  }, [grid]);
  const put = (d: number) => {
    if (sel < 0 || puz[sel]) return;
    if (noteMode && d) {
      setNotes((n) => n.map((x, i) => (i === sel ? x ^ (1 << d) : x)));
      return;
    }
    if (d && d !== sol[sel]) {
      mistakes.current++;
      feedback(false);
    } else if (d) sfx.tick();
    const g = grid.map((x, i) => (i === sel ? d : x));
    setGrid(g);
    if (g.every((x, i) => x === sol[i])) {
      feedback(true);
      const secs = time.get();
      finish({ score: Math.round(secs), accuracy: clamp(1 - mistakes.current * 0.06, 0.3, 1), metrics: { errores: mistakes.current, pistas: givens }, summary: `Resuelto en ${fmt(secs)} con ${mistakes.current} errores (${givens} pistas)` });
    }
  };
  useKey((e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) put(n);
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') put(0);
    if (e.key === 'n' || e.key === 'N') setNoteMode((m) => !m);
    const mv: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in mv) {
      e.preventDefault();
      setSel((s) => clamp(s + mv[e.key], 0, 80));
    }
  }, [sel, grid, noteMode]);
  const sv = sel >= 0 ? grid[sel] : 0;
  return (
    <div className="mx-auto max-w-md">
      <GameHud>
        <span className="font-mono">{fmt(time.s)}</span>
        <span>Errores: {mistakes.current}</span>
        <Button size="sm" variant="ghost" onClick={() => finish({ score: Math.round(time.get()) + 900, accuracy: (grid.filter((x, i) => x && x === sol[i]).length - givens) / (81 - givens) * 0.6, summary: 'Sudoku abandonado' })}>
          Rendirse
        </Button>
      </GameHud>
      <div className="grid aspect-square w-full grid-cols-9 overflow-hidden rounded-xl border-2 border-white/30">
        {grid.map((v, i) => {
          const r = Math.floor(i / 9), c = i % 9;
          const same = sv && v === sv;
          const peer = sel >= 0 && (Math.floor(sel / 9) === r || sel % 9 === c);
          return (
            <button
              key={i}
              onClick={() => setSel(i)}
              className={cx('relative flex items-center justify-center font-display text-lg sm:text-xl', c % 3 === 2 && c < 8 && 'border-r-2 border-r-white/30', c % 3 !== 2 && 'border-r border-r-white/10', r % 3 === 2 && r < 8 && 'border-b-2 border-b-white/30', r % 3 !== 2 && 'border-b border-b-white/10')}
              style={{ background: i === sel ? 'rgba(52,211,153,.3)' : same ? 'rgba(52,211,153,.14)' : peer ? 'rgba(255,255,255,.04)' : 'transparent', color: conflicts.has(i) ? '#fb7185' : puz[i] ? '#e7eaf3' : C.rea, fontWeight: puz[i] ? 600 : 500 }}
              aria-label={`Fila ${r + 1}, columna ${c + 1}${v ? `: ${v}` : ''}`}
            >
              {v ? (
                v
              ) : notes[i] ? (
                <span className="grid h-full w-full grid-cols-3 p-0.5 text-[8px] leading-none text-ink-400 sm:text-[9px]">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <span key={d} className="flex items-center justify-center">{notes[i] & (1 << d) ? d : ''}</span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-9 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} onClick={() => put(d)} className="h-11 rounded-lg bg-white/[.06] font-display text-lg hover:bg-white/10">
            {d}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant={noteMode ? 'primary' : 'soft'} accent={C.rea} icon={<Pencil size={14} />} onClick={() => setNoteMode(!noteMode)}>
          Notas (N)
        </Button>
        <Button size="sm" icon={<Eraser size={14} />} onClick={() => put(0)}>
          Borrar
        </Button>
      </div>
    </div>
  );
}

export const sudoku: GameDef = {
  id: 'sudoku',
  name: 'Sudoku',
  domain: 'razonamiento',
  tagline: 'Sudokus generados con solución única.',
  instructions: ['Completa la cuadrícula: cada fila, columna y caja 3×3 contiene los números del 1 al 9.', 'Usa el modo notas (N) para apuntar candidatos.', 'Las pistas disminuyen al subir de nivel.'],
  why: 'El Sudoku entrena el razonamiento deductivo y la memoria de trabajo: mantener candidatos y propagar restricciones. Cada puzzle se genera al momento y se verifica que tenga una única solución.',
  keys: '1–9 · flechas · N = notas · Retroceso = borrar',
  maxLevel: 9,
  scoreUnit: 's',
  higherBetter: false,
  normalize: (r, level) => clamp(scale(1500 - r.score, 0, 1300) * 0.5 + level * 5.5, 0, 100) * r.accuracy,
  Component: Sudoku,
  minutes: 8,
};

// ─────────────────────────── Nonograma ───────────────────────────
const clues = (line: number[]) => {
  const out: number[] = [];
  let run = 0;
  for (const v of line) {
    if (v) run++;
    else if (run) (out.push(run), (run = 0));
  }
  if (run) out.push(run);
  return out.length ? out : [0];
};

function Nonogram({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 5 : level <= 2 ? 5 : level <= 4 ? 7 : level <= 6 ? 8 : 10;
  const sol = useMemo(() => {
    let g: number[];
    do g = [...Array(n * n)].map(() => (chance(0.58) ? 1 : 0));
    while (g.every((x) => x) || g.every((x) => !x));
    return g;
  }, [n]);
  const rowC = useMemo(() => [...Array(n).keys()].map((r) => clues(sol.slice(r * n, r * n + n))), [sol, n]);
  const colC = useMemo(() => [...Array(n).keys()].map((c) => clues([...Array(n).keys()].map((r) => sol[r * n + c]))), [sol, n]);
  const [g, setG] = useState<number[]>(Array(n * n).fill(0)); // 0 vacío, 1 lleno, 2 marcado X
  const [mode, setMode] = useState<1 | 2>(1);
  const drag = useRef<number | null>(null);
  const time = useElapsed();
  const check = (gg: number[]) => {
    const f = gg.map((x) => (x === 1 ? 1 : 0));
    const ok = [...Array(n).keys()].every((r) => clues(f.slice(r * n, r * n + n)).join() === rowC[r].join()) && [...Array(n).keys()].every((c) => clues([...Array(n).keys()].map((r) => f[r * n + c])).join() === colC[c].join());
    if (ok) {
      feedback(true);
      const secs = time.get();
      finish({ score: Math.round(secs), accuracy: 1, metrics: { tamaño: n }, summary: `Nonograma ${n}×${n} en ${fmt(secs)}` });
    }
  };
  const paint = (i: number, val?: number) => {
    setG((prev) => {
      const v = val ?? (prev[i] === mode ? 0 : mode);
      drag.current = v;
      if (prev[i] === v) return prev;
      const nx = prev.slice();
      nx[i] = v;
      check(nx);
      return nx;
    });
  };
  const rowDone = (r: number) => clues(g.slice(r * n, r * n + n).map((x) => (x === 1 ? 1 : 0))).join() === rowC[r].join();
  const colDone = (c: number) => clues([...Array(n).keys()].map((r) => (g[r * n + c] === 1 ? 1 : 0))).join() === colC[c].join();
  const maxR = Math.max(...rowC.map((x) => x.length));
  const maxC = Math.max(...colC.map((x) => x.length));
  const cell = n <= 5 ? 'min(13vw,52px)' : n <= 8 ? 'min(8.5vw,40px)' : 'min(7vw,32px)';
  return (
    <div className="mx-auto w-fit max-w-full">
      <GameHud>
        <span className="font-mono">{fmt(time.s)}</span>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === 1 ? 'primary' : 'soft'} accent={C.rea} icon={<Square size={14} />} onClick={() => setMode(1)}>Rellenar</Button>
          <Button size="sm" variant={mode === 2 ? 'primary' : 'soft'} accent={C.rea} icon={<XIcon size={14} />} onClick={() => setMode(2)}>Marcar</Button>
        </div>
      </GameHud>
      <div className="overflow-x-auto pb-2" onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
        <div className="grid select-none" style={{ gridTemplateColumns: `auto repeat(${n}, ${cell})`, touchAction: 'none' }}>
          <div />
          {colC.map((c, ci) => (
            <div key={ci} className={cx('flex flex-col items-center justify-end pb-1 font-mono text-[11px] leading-tight', colDone(ci) ? 'text-ink-500' : 'text-ink-200')} style={{ minHeight: maxC * 14 }}>
              {c.map((x, k) => <span key={k}>{x}</span>)}
            </div>
          ))}
          {[...Array(n).keys()].map((r) => (
            <div key={r} className="contents">
              <div className={cx('flex items-center justify-end gap-1.5 pr-2 font-mono text-[11px]', rowDone(r) ? 'text-ink-500' : 'text-ink-200')} style={{ minWidth: maxR * 14 }}>
                {rowC[r].map((x, k) => <span key={k}>{x}</span>)}
              </div>
              {[...Array(n).keys()].map((c) => {
                const i = r * n + c;
                return (
                  <div
                    key={c}
                    onPointerDown={(e) => {
                      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                      paint(i);
                    }}
                    onPointerEnter={() => drag.current !== null && paint(i, drag.current)}
                    onContextMenu={(e) => (e.preventDefault(), paint(i, g[i] === 2 ? 0 : 2))}
                    className={cx('flex aspect-square cursor-pointer items-center justify-center border border-white/10', c % 5 === 4 && c < n - 1 && 'border-r-white/30', r % 5 === 4 && r < n - 1 && 'border-b-white/30')}
                    style={{ background: g[i] === 1 ? C.rea : 'rgba(255,255,255,.03)' }}
                  >
                    {g[i] === 2 && <XIcon size={14} className="text-ink-400" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 text-right">
        <Button size="sm" variant="ghost" onClick={() => finish({ score: Math.round(time.get()) + 600, accuracy: g.filter((x, i) => (x === 1) === (sol[i] === 1)).length / (n * n) * 0.6, summary: 'Nonograma abandonado' })}>Rendirse</Button>
      </div>
    </div>
  );
}

export const nonogram: GameDef = {
  id: 'nonogram',
  name: 'Nonogramas',
  domain: 'razonamiento',
  tagline: 'Pinta la imagen oculta a partir de pistas numéricas.',
  instructions: ['Los números de cada fila y columna indican bloques consecutivos de casillas rellenas, en orden.', 'Rellena casillas (o márcalas con X si sabes que están vacías; clic derecho también marca).', 'Puedes arrastrar para pintar varias casillas.'],
  why: 'Los nonogramas combinan deducción lógica y razonamiento espacial: cada pista restringe las posibilidades y la intersección de filas y columnas obliga a pensar en ambos ejes a la vez.',
  maxLevel: 8,
  scoreUnit: 's',
  higherBetter: false,
  normalize: (r, level) => clamp(scale(900 - r.score, 0, 800) * 0.5 + level * 6, 0, 100) * r.accuracy,
  Component: Nonogram,
  minutes: 6,
};

// ─────────────────────────── Kakuro ───────────────────────────
interface KCell { black: boolean; v: number; down?: number; across?: number }
function makeKakuro(n: number): KCell[][] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const b: boolean[][] = [...Array(n)].map((_, r) => [...Array(n)].map((_, c) => r === 0 || c === 0 || chance(0.22)));
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 1; r < n; r++)
        for (let c = 1; c < n; c++) {
          if (b[r][c]) continue;
          const h = (b[r][c - 1] ? 0 : 1) + (c + 1 < n && !b[r][c + 1] ? 1 : 0);
          const v = (b[r - 1][c] ? 0 : 1) + (r + 1 < n && !b[r + 1][c] ? 1 : 0);
          if (h === 0 || v === 0) {
            b[r][c] = true;
            changed = true;
          }
        }
    }
    const whites: [number, number][] = [];
    for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) if (!b[r][c]) whites.push([r, c]);
    if (whites.length < (n - 1) * (n - 1) * 0.55) continue;
    const vals: number[][] = [...Array(n)].map(() => Array(n).fill(0));
    const runH = (r: number, c: number) => { let s = c; while (!b[r][s - 1]) s--; const cells: number[] = []; for (let k = s; k < n && !b[r][k]; k++) cells.push(vals[r][k]); return cells; };
    const runV = (r: number, c: number) => { let s = r; while (!b[s - 1][c]) s--; const cells: number[] = []; for (let k = s; k < n && !b[k][c]; k++) cells.push(vals[k][c]); return cells; };
    const solve = (idx: number): boolean => {
      if (idx === whites.length) return true;
      const [r, c] = whites[idx];
      for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        if (runH(r, c).includes(d) || runV(r, c).includes(d)) continue;
        vals[r][c] = d;
        if (solve(idx + 1)) return true;
        vals[r][c] = 0;
      }
      return false;
    };
    if (!solve(0)) continue;
    const grid: KCell[][] = [...Array(n)].map((_, r) => [...Array(n)].map((_, c) => ({ black: b[r][c], v: vals[r][c] })));
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (!b[r][c]) continue;
        if (c + 1 < n && !b[r][c + 1]) { let s = 0; for (let k = c + 1; k < n && !b[r][k]; k++) s += vals[r][k]; grid[r][c].across = s; }
        if (r + 1 < n && !b[r + 1][c]) { let s = 0; for (let k = r + 1; k < n && !b[k][c]; k++) s += vals[k][c]; grid[r][c].down = s; }
      }
    return grid;
  }
  throw new Error('kakuro');
}

function Kakuro({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 5 : clamp(5 + Math.floor((level - 1) / 2), 5, 9);
  const grid = useMemo(() => makeKakuro(n), [n]);
  const [vals, setVals] = useState<number[][]>(() => grid.map((row) => row.map(() => 0)));
  const first = useMemo(() => { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!grid[r][c].black) return [r, c]; return [1, 1]; }, [grid, n]);
  const [sel, setSel] = useState<number[]>(first);
  const time = useElapsed();
  const runs = useMemo(() => {
    const out: { cells: [number, number][]; sum: number }[] = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const g = grid[r][c];
        if (g.across) { const cells: [number, number][] = []; for (let k = c + 1; k < n && !grid[r][k].black; k++) cells.push([r, k]); out.push({ cells, sum: g.across }); }
        if (g.down) { const cells: [number, number][] = []; for (let k = r + 1; k < n && !grid[k][c].black; k++) cells.push([k, c]); out.push({ cells, sum: g.down }); }
      }
    return out;
  }, [grid, n]);
  const status = (vv: number[][]) => runs.map((run) => {
    const xs = run.cells.map(([r, c]) => vv[r][c]);
    const filled = xs.every((x) => x);
    const dup = new Set(xs.filter((x) => x)).size !== xs.filter((x) => x).length;
    const s = xs.reduce((a, b) => a + b, 0);
    return { ok: filled && !dup && s === run.sum, bad: dup || (filled && s !== run.sum) || s > run.sum };
  });
  const st = status(vals);
  const badCells = new Set<string>();
  st.forEach((x, k) => x.bad && runs[k].cells.forEach(([r, c]) => badCells.add(`${r},${c}`)));
  const put = (d: number) => {
    const [r, c] = sel;
    if (grid[r]?.[c]?.black) return;
    const nv = vals.map((row) => row.slice());
    nv[r][c] = d;
    setVals(nv);
    sfx.tick();
    if (status(nv).every((x) => x.ok)) {
      feedback(true);
      const secs = time.get();
      finish({ score: Math.round(secs), accuracy: 1, metrics: { tamaño: n }, summary: `Kakuro ${n - 1}×${n - 1} en ${fmt(secs)}` });
    }
  };
  useKey((e) => {
    const d = parseInt(e.key, 10);
    if (d >= 1 && d <= 9) put(d);
    if (e.key === 'Backspace' || e.key === '0') put(0);
    const mv: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (e.key in mv) {
      e.preventDefault();
      setSel(([r, c]) => [clamp(r + mv[e.key][0], 1, n - 1), clamp(c + mv[e.key][1], 1, n - 1)]);
    }
  }, [sel, vals]);
  return (
    <div className="mx-auto max-w-md">
      <GameHud>
        <span className="font-mono">{fmt(time.s)}</span>
        <span>Suma cada bloque sin repetir cifras</span>
      </GameHud>
      <div className="grid w-full overflow-hidden rounded-xl border border-white/20" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
        {grid.map((row, r) =>
          row.map((g, c) =>
            g.black ? (
              <div key={`${r}-${c}`} className="relative aspect-square border border-white/5 bg-ink-950">
                {(g.down || g.across) && (
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                    <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,.2)" strokeWidth="2" />
                    {g.across && <text x="94" y="40" textAnchor="end" fontSize="30" fill={C.rea} fontWeight={600}>{g.across}</text>}
                    {g.down && <text x="8" y="90" fontSize="30" fill="#e7eaf3" fontWeight={600}>{g.down}</text>}
                  </svg>
                )}
              </div>
            ) : (
              <button key={`${r}-${c}`} onClick={() => setSel([r, c])} className="flex aspect-square items-center justify-center border border-white/10 font-display text-xl" style={{ background: sel[0] === r && sel[1] === c ? 'rgba(52,211,153,.3)' : 'rgba(255,255,255,.04)', color: badCells.has(`${r},${c}`) ? '#fb7185' : '#e7eaf3' }}>
                {vals[r][c] || ''}
              </button>
            ),
          ),
        )}
      </div>
      <div className="mt-3 grid grid-cols-10 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} onClick={() => put(d)} className="h-11 rounded-lg bg-white/[.06] font-display text-lg hover:bg-white/10">{d}</button>
        ))}
        <button onClick={() => put(0)} className="flex h-11 items-center justify-center rounded-lg bg-white/[.06] hover:bg-white/10" aria-label="Borrar"><Eraser size={16} /></button>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
        <span>Verde arriba = suma horizontal · blanco abajo = suma vertical</span>
        <Button size="sm" variant="ghost" onClick={() => finish({ score: Math.round(time.get()) + 600, accuracy: st.filter((x) => x.ok).length / st.length * 0.6, summary: 'Kakuro abandonado' })}>Rendirse</Button>
      </div>
    </div>
  );
}

export const kakuro: GameDef = {
  id: 'kakuro',
  name: 'Kakuro',
  domain: 'calculo',
  tagline: 'Crucigrama de sumas: lógica y aritmética.',
  instructions: ['Cada bloque blanco debe sumar el número de su pista (horizontal arriba-derecha, vertical abajo-izquierda).', 'Usa cifras del 1 al 9 sin repetirlas dentro de un mismo bloque.', 'Los bloques con error se marcan en rojo.'],
  why: 'El Kakuro combina cálculo mental con deducción: conocer las combinaciones únicas (p. ej. 3 en dos casillas = 1+2) y cruzar restricciones entrena memoria de trabajo y fluidez numérica.',
  maxLevel: 9,
  scoreUnit: 's',
  higherBetter: false,
  normalize: (r, level) => clamp(scale(1200 - r.score, 0, 1100) * 0.5 + level * 6, 0, 100) * r.accuracy,
  Component: Kakuro,
  minutes: 7,
};

// ─────────────────────────── Torre de Hanói ───────────────────────────
function Hanoi({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 3 : clamp(2 + level, 3, 8);
  const [pegs, setPegs] = useState<number[][]>([[...Array(n)].map((_, i) => n - i), [], []]);
  const [hold, setHold] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [bad, setBad] = useState<number | null>(null);
  const time = useElapsed();
  const optimal = 2 ** n - 1;
  const click = (p: number) => {
    if (hold === null) {
      if (pegs[p].length) {
        setHold(p);
        sfx.click();
      }
      return;
    }
    if (hold === p) return setHold(null);
    const disc = pegs[hold][pegs[hold].length - 1];
    const top = pegs[p][pegs[p].length - 1];
    if (top !== undefined && top < disc) {
      feedback(false);
      setBad(p);
      setTimeout(() => setBad(null), 300);
      setHold(null);
      return;
    }
    const np = pegs.map((x) => x.slice());
    np[hold].pop();
    np[p].push(disc);
    setPegs(np);
    setHold(null);
    sfx.tick();
    const m = moves + 1;
    setMoves(m);
    if (np[2].length === n) {
      feedback(true);
      const secs = time.get();
      finish({ score: m, accuracy: optimal / m, metrics: { discos: n, optimo: optimal, segundos: Math.round(secs) }, summary: `${n} discos en ${m} movimientos (óptimo ${optimal})` });
    }
  };
  useKey((e) => {
    const k = parseInt(e.key, 10);
    if (k >= 1 && k <= 3) click(k - 1);
  }, [hold, pegs, moves]);
  const hues = ['#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#fbbf24', '#a3e635'];
  return (
    <div className="mx-auto max-w-2xl">
      <GameHud>
        <span>Movimientos: {moves} · óptimo {optimal}</span>
        <span className="font-mono">{fmt(time.s)}</span>
      </GameHud>
      <div className="grid grid-cols-3 gap-2">
        {pegs.map((peg, p) => (
          <button key={p} onClick={() => click(p)} className={cx('relative flex h-64 flex-col-reverse items-center rounded-2xl border pb-3 transition', hold === p ? 'border-rea/70 bg-rea/10' : bad === p ? 'border-rose-400/70' : 'border-white/[.07] bg-white/[.02] hover:bg-white/[.04]')} aria-label={`Varilla ${p + 1}`}>
            <div className="absolute bottom-3 top-6 w-1.5 rounded-full bg-white/15" />
            {peg.map((d, k) => (
              <motion.div layout key={d} className="relative z-10 mt-1 h-5 rounded-md" style={{ width: `${20 + (d / n) * 75}%`, background: hues[(d - 1) % hues.length], y: hold === p && k === peg.length - 1 ? -16 : 0 }} />
            ))}
            <span className="absolute top-1 font-mono text-[10px] text-ink-500">{p + 1}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">Toca una varilla para coger el disco superior y otra para soltarlo (teclas 1–3).</p>
    </div>
  );
}

export const hanoi: GameDef = {
  id: 'hanoi',
  name: 'Torre de Hanói',
  domain: 'razonamiento',
  tagline: 'Planifica: mueve la torre con el mínimo de movimientos.',
  instructions: ['Mueve todos los discos a la varilla derecha.', 'Solo puedes mover un disco a la vez y nunca sobre uno más pequeño.', 'Intenta acercarte al número óptimo de movimientos (2ⁿ − 1).'],
  why: 'La Torre de Hanói es una prueba clásica de planificación y función ejecutiva: exige descomponer el objetivo en submetas (recursión) y mantenerlas en memoria de trabajo.',
  keys: '1 · 2 · 3',
  maxLevel: 6,
  scoreUnit: 'movimientos',
  higherBetter: false,
  normalize: (r, level) => clamp(r.accuracy * 50 + level * 8, 0, 100),
  Component: Hanoi,
};
