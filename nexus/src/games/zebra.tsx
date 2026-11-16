import { useMemo, useRef, useState } from 'react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, pick, rand, scale, shuffle } from '../core/rng';
import { C, useFinish } from './kit';
import { Button, GameHud, cx } from '../components/ui';

const CATS = [
  { name: 'Color', vals: ['roja', 'verde', 'azul', 'amarilla', 'blanca'], ph: (v: string) => `quien vive en la casa ${v}` },
  { name: 'Nacionalidad', vals: ['español', 'mexicano', 'argentino', 'chileno', 'peruano'], ph: (v: string) => `el ${v}` },
  { name: 'Mascota', vals: ['perro', 'gato', 'pez', 'loro', 'conejo'], ph: (v: string) => `el dueño del ${v}` },
  { name: 'Bebida', vals: ['café', 'té', 'agua', 'zumo', 'leche'], ph: (v: string) => `quien bebe ${v}` },
  { name: 'Profesión', vals: ['médico', 'pintor', 'chef', 'piloto', 'músico'], ph: (v: string) => `el ${v}` },
];

type Item = [number, number]; // [categoría, valor]
type Clue =
  | { t: 'same' | 'not' | 'left' | 'next' | 'before'; a: Item; b: Item }
  | { t: 'pos'; a: Item; k: number };

const perms = (n: number): number[][] => {
  if (n === 1) return [[0]];
  const out: number[][] = [];
  for (const p of perms(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
};

/** sol[c][v] = casa donde está el valor v de la categoría c */
function holds(cl: Clue, sol: number[][]): boolean {
  const ha = sol[cl.a[0]][cl.a[1]];
  if (cl.t === 'pos') return ha === cl.k;
  const hb = sol[cl.b[0]][cl.b[1]];
  switch (cl.t) {
    case 'same': return ha === hb;
    case 'not': return ha !== hb;
    case 'left': return ha + 1 === hb;
    case 'next': return Math.abs(ha - hb) === 1;
    case 'before': return ha < hb;
  }
}
const cats = (cl: Clue) => (cl.t === 'pos' ? [cl.a[0]] : [cl.a[0], cl.b[0]]);

function countSolutions(nH: number, nC: number, clues: Clue[], limit = 2): number {
  const P = perms(nH);
  const sol: number[][] = [];
  const byMax: Clue[][] = [...Array(nC)].map(() => []);
  for (const cl of clues) byMax[Math.max(...cats(cl))].push(cl);
  let count = 0;
  const rec = (c: number) => {
    if (count >= limit) return;
    if (c === nC) {
      count++;
      return;
    }
    for (const p of P) {
      sol[c] = p;
      if (byMax[c].every((cl) => holds(cl, sol))) rec(c + 1);
      if (count >= limit) return;
    }
  };
  rec(0);
  return count;
}

function randomClue(sol: number[][], nH: number, nC: number): Clue {
  const item = (): Item => [rand(nC), rand(nH)];
  const a = item();
  let b = item();
  while (b[0] === a[0]) b = item();
  const ha = sol[a[0]][a[1]];
  const r = Math.random();
  if (r < 0.12) return { t: 'pos', a, k: ha };
  // elige b con una relación verdadera
  const valAt = (c: number, h: number) => sol[c].indexOf(h);
  if (r < 0.45) return { t: 'same', a, b: [b[0], valAt(b[0], ha)] };
  if (r < 0.62 && ha + 1 < nH) return { t: 'left', a, b: [b[0], valAt(b[0], ha + 1)] };
  if (r < 0.75) {
    const opts = [ha - 1, ha + 1].filter((h) => h >= 0 && h < nH);
    return { t: 'next', a, b: [b[0], valAt(b[0], pick(opts))] };
  }
  if (r < 0.85 && ha < nH - 1) return { t: 'before', a, b: [b[0], valAt(b[0], ha + 1 + rand(nH - ha - 1))] };
  const other = valAt(b[0], pick([...Array(nH).keys()].filter((h) => h !== ha)));
  return { t: 'not', a, b: [b[0], other] };
}

function makeZebra(nH: number, nC: number) {
  const P = perms(nH);
  const sol = [...Array(nC)].map(() => pick(P));
  let clues: Clue[] = [];
  let guard = 0;
  while (guard++ < 80) {
    clues.push(randomClue(sol, nH, nC));
    if (countSolutions(nH, nC, clues) === 1) break;
  }
  // eliminar pistas redundantes
  for (const cl of shuffle(clues)) {
    const rest = clues.filter((x) => x !== cl);
    if (countSolutions(nH, nC, rest) === 1) clues = rest;
  }
  return { sol, clues: shuffle(clues) };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function clueText(cl: Clue) {
  const A = CATS[cl.a[0]].ph(CATS[cl.a[0]].vals[cl.a[1]]);
  if (cl.t === 'pos') return `${cap(A)} está en la casa ${cl.k + 1}.`;
  const B = CATS[cl.b[0]].ph(CATS[cl.b[0]].vals[cl.b[1]]);
  const m = { same: 'vive en la misma casa que', not: 'no vive en la misma casa que', left: 'vive justo a la izquierda de', next: 'vive al lado de', before: 'vive en algún lugar a la izquierda de' }[cl.t];
  return `${cap(A)} ${m} ${B}.`;
}

function Zebra({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const nH = short ? 3 : level <= 2 ? 3 : level <= 5 ? 4 : 5;
  const nC = short ? 3 : level <= 1 ? 3 : level <= 7 ? 4 : nH === 5 ? 4 : 5;
  const catIdx = useMemo(() => [...Array(nC).keys()], [nC]);
  const { sol, clues } = useMemo(() => makeZebra(nH, nC), [nH, nC]);
  const [ans, setAns] = useState<(number | null)[][]>(() => catIdx.map(() => Array(nH).fill(null)));
  const [struck, setStruck] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const checks = useRef(0);
  const t0 = useRef(performance.now());
  const set = (c: number, h: number, v: number | null) => setAns((a) => a.map((row, ci) => row.map((x, hi) => (ci === c && hi === h ? v : ci === c && x === v && v !== null ? null : x))));
  const check = () => {
    checks.current++;
    let wrong = 0, empty = 0;
    catIdx.forEach((c) => [...Array(nH).keys()].forEach((h) => {
      const v = ans[c][h];
      if (v === null) empty++;
      else if (sol[c][v] !== h) wrong++;
    }));
    if (!wrong && !empty) {
      feedback(true);
      const secs = (performance.now() - t0.current) / 1000;
      finish({ score: Math.round(secs), accuracy: clamp(1 - (checks.current - 1) * 0.12, 0.4, 1), metrics: { casas: nH, categorias: nC, comprobaciones: checks.current }, summary: `Acertijo ${nH}×${nC} resuelto en ${Math.round(secs)} s` });
    } else {
      feedback(false);
      setMsg(empty ? `Faltan ${empty} casillas${wrong ? ` y hay ${wrong} incorrectas` : ''}.` : `Hay ${wrong} casillas incorrectas.`);
    }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div>
        <GameHud>
          <span>{nH} casas · {nC} categorías</span>
          <span>Comprobaciones: {checks.current}</span>
        </GameHud>
        <ol className="space-y-1.5">
          {clues.map((cl, i) => (
            <li key={i}>
              <button onClick={() => setStruck((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} className={cx('w-full rounded-lg px-3 py-2 text-left text-sm transition', struck.has(i) ? 'bg-white/[.02] text-ink-500 line-through' : 'bg-white/[.04] text-ink-200 hover:bg-white/[.07]')}>
                <span className="mr-2 font-mono text-xs text-rea">{i + 1}</span>
                {clueText(cl)}
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-ink-500">Toca una pista para tacharla cuando ya la hayas usado. «Izquierda» = casa con número menor.</p>
      </div>
      <div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th />
                {[...Array(nH).keys()].map((h) => (
                  <th key={h} className="font-display text-xs font-semibold text-ink-400">Casa {h + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catIdx.map((c) => (
                <tr key={c}>
                  <td className="pr-1 text-xs font-semibold uppercase tracking-wider text-ink-400">{CATS[c].name}</td>
                  {[...Array(nH).keys()].map((h) => (
                    <td key={h}>
                      <select id={`z-${c}-${h}`} value={ans[c][h] ?? ''} onChange={(e) => set(c, h, e.target.value === '' ? null : Number(e.target.value))} className="h-10 w-full min-w-[78px] rounded-lg border border-white/10 bg-ink-900 px-1.5 text-ink-100 outline-none focus:border-rea/60">
                        <option value="">—</option>
                        {CATS[c].vals.slice(0, nH).map((v, vi) => (
                          <option key={v} value={vi}>{v}</option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" accent={C.rea} onClick={check}>Comprobar</Button>
          <Button variant="ghost" onClick={() => finish({ score: Math.round((performance.now() - t0.current) / 1000) + 600, accuracy: 0.3, summary: 'Acertijo abandonado' })}>Rendirse</Button>
          {msg && <span className="text-sm text-amber-300">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

export const zebra: GameDef = {
  id: 'zebra',
  name: 'Acertijo de Einstein',
  domain: 'razonamiento',
  tagline: 'Deduce quién vive en cada casa a partir de pistas.',
  instructions: ['Cada casa tiene un valor distinto de cada categoría.', 'Usa las pistas para deducir la tabla completa.', 'Cada acertijo se genera al momento y tiene una única solución.'],
  why: 'Los acertijos tipo cebra entrenan el razonamiento deductivo encadenado: combinar varias restricciones para descartar posibilidades. Llevar un registro externo (la tabla) libera memoria de trabajo para el razonamiento.',
  maxLevel: 9,
  scoreUnit: 's',
  higherBetter: false,
  normalize: (r, level) => clamp(scale(900 - r.score, 0, 800) * 0.5 + level * 6, 0, 100) * r.accuracy,
  Component: Zebra,
  minutes: 6,
};
