import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, norm, pick, rand, sample, shuffle } from '../core/rng';
import { C, Choices, useFinish } from './kit';
import { Button, GameHud, inputCls, useCountdown, TimerRing } from '../components/ui';

const NAMES = ['Lucía', 'Mateo', 'Sofía', 'Hugo', 'Valentina', 'Martín', 'Camila', 'Leo', 'Isabella', 'Daniel', 'Martina', 'Pablo', 'Elena', 'Álvaro', 'Julia', 'Diego', 'Paula', 'Adrián', 'Carmen', 'Bruno', 'Irene', 'Marcos', 'Noa', 'Gonzalo', 'Alba', 'Tomás', 'Olivia', 'Iván', 'Renata', 'Joaquín', 'Ximena', 'Rodrigo', 'Abril', 'Emilio', 'Jimena', 'Sebastián', 'Clara', 'Nicolás', 'Lola', 'Andrés', 'Vera', 'Rafael', 'Inés', 'Gael', 'Aitana', 'Óscar', 'Mía', 'Ramiro', 'Rocío', 'Fermín', 'Amaia', 'Julián', 'Celia', 'Héctor', 'Nerea', 'Ulises', 'Zoe', 'Bernardo', 'Dafne', 'Esteban'];
const JOBS = ['arquitecta', 'panadero', 'piloto', 'bióloga', 'músico', 'cirujana', 'carpintero', 'astrónoma', 'chef', 'abogado', 'fotógrafa', 'bombero', 'profesora', 'jardinero', 'ingeniera', 'pintor'];

const SKIN = ['#f6d2b8', '#eab894', '#d39a6a', '#b07148', '#8a5432', '#5c3720'];
const HAIR = ['#1b1410', '#3b2414', '#6b4423', '#a8743a', '#d9b26a', '#b8b8b8', '#8c2f1c', '#2a2a3a'];
const EYE = ['#3b2a1a', '#2e5e8c', '#3f7a4a', '#6b4b2a', '#4a4a5a'];
const SHIRT = ['#7c3aed', '#0891b2', '#d97706', '#059669', '#2563eb', '#db2777', '#ea580c', '#4b5563'];

export interface Face {
  skin: string; hair: string; hairStyle: number; eye: string; eyeShape: number; brow: number; nose: number; mouth: number; glasses: number; beard: number; shirt: string; faceW: number; faceH: number; earring: boolean; freckles: boolean; mole: boolean;
}

export function randomFace(): Face {
  return { skin: pick(SKIN), hair: pick(HAIR), hairStyle: rand(7), eye: pick(EYE), eyeShape: rand(3), brow: rand(3), nose: rand(3), mouth: rand(4), glasses: rand(5) < 1 ? 1 + rand(2) : 0, beard: rand(4) < 1 ? 1 + rand(3) : 0, shirt: pick(SHIRT), faceW: 40 + rand(9), faceH: 50 + rand(8), earring: rand(5) === 0, freckles: rand(6) === 0, mole: rand(7) === 0 };
}

export function FaceSvg({ f, size = 180 }: { f: Face; size?: number }) {
  const cx = 100, cy = 98;
  const hairBack = f.hairStyle === 2 || f.hairStyle === 5;
  return (
    <svg viewBox="0 0 200 220" width={size} height={size * 1.1} role="img" aria-label="Rostro">
      <rect x="0" y="0" width="200" height="220" rx="20" fill="#121830" />
      {hairBack && <path d={`M${cx - f.faceW - 8},${cy - 10} Q${cx},${cy - f.faceH - 40} ${cx + f.faceW + 8},${cy - 10} L${cx + f.faceW + 12},${cy + 70} L${cx - f.faceW - 12},${cy + 70} Z`} fill={f.hair} />}
      <path d={`M40,220 Q100,${150} 160,220 Z`} fill={f.shirt} />
      <rect x={cx - 14} y={cy + f.faceH - 12} width="28" height="30" fill={f.skin} />
      <ellipse cx={cx - f.faceW} cy={cy + 4} rx="8" ry="12" fill={f.skin} />
      <ellipse cx={cx + f.faceW} cy={cy + 4} rx="8" ry="12" fill={f.skin} />
      {f.earring && <circle cx={cx - f.faceW} cy={cy + 18} r="3.5" fill="#fbbf24" />}
      <ellipse cx={cx} cy={cy} rx={f.faceW} ry={f.faceH} fill={f.skin} />
      {/* pelo */}
      {f.hairStyle === 1 && <path d={`M${cx - f.faceW},${cy - 8} Q${cx - f.faceW},${cy - f.faceH - 14} ${cx},${cy - f.faceH - 10} Q${cx + f.faceW},${cy - f.faceH - 14} ${cx + f.faceW},${cy - 8} Q${cx},${cy - f.faceH + 10} ${cx - f.faceW},${cy - 8}Z`} fill={f.hair} />}
      {(f.hairStyle === 2 || f.hairStyle === 5) && <path d={`M${cx - f.faceW - 4},${cy + 10} Q${cx - f.faceW - 6},${cy - f.faceH - 18} ${cx},${cy - f.faceH - 12} Q${cx + f.faceW + 6},${cy - f.faceH - 18} ${cx + f.faceW + 4},${cy + 10} Q${cx + 10},${cy - f.faceH + 16} ${cx - f.faceW - 4},${cy + 10}Z`} fill={f.hair} />}
      {f.hairStyle === 3 && [...Array(9)].map((_, i) => <circle key={i} cx={cx - f.faceW + 4 + i * (f.faceW / 4)} cy={cy - f.faceH + 4 + (i % 2) * 6} r="14" fill={f.hair} />)}
      {f.hairStyle === 4 && <rect x={cx - 8} y={cy - f.faceH - 16} width="16" height="36" rx="8" fill={f.hair} />}
      {f.hairStyle === 5 && <circle cx={cx} cy={cy - f.faceH - 14} r="15" fill={f.hair} />}
      {f.hairStyle === 6 && <path d={`M${cx - f.faceW + 6},${cy - f.faceH + 22} Q${cx},${cy - f.faceH - 6} ${cx + f.faceW - 6},${cy - f.faceH + 22}`} stroke={f.hair} strokeWidth="10" fill="none" strokeLinecap="round" />}
      {/* cejas */}
      {[-1, 1].map((s) => (
        <path key={s} d={`M${cx + s * 10},${cy - 18 - (f.brow === 2 ? s * 3 : 0)} L${cx + s * 30},${cy - 20 + (f.brow === 2 ? s * 3 : 0)}`} stroke={f.hair === '#b8b8b8' ? '#777' : f.hair} strokeWidth={f.brow === 1 ? 6 : 3.5} strokeLinecap="round" />
      ))}
      {/* ojos */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={cx + s * 20} cy={cy - 6} rx={f.eyeShape === 1 ? 8 : 7} ry={f.eyeShape === 2 ? 3.5 : 5.5} fill="#fff" />
          <circle cx={cx + s * 20} cy={cy - 6} r="3.6" fill={f.eye} />
          <circle cx={cx + s * 20 + 1} cy={cy - 7} r="1.1" fill="#fff" />
        </g>
      ))}
      {f.glasses === 1 && <g stroke="#e5e7eb" strokeWidth="2.5" fill="none"><circle cx={cx - 20} cy={cy - 6} r="12" /><circle cx={cx + 20} cy={cy - 6} r="12" /><path d={`M${cx - 8},${cy - 6} L${cx + 8},${cy - 6}`} /></g>}
      {f.glasses === 2 && <g stroke="#111" strokeWidth="3" fill="rgba(0,0,0,.08)"><rect x={cx - 33} y={cy - 16} width="26" height="18" rx="3" /><rect x={cx + 7} y={cy - 16} width="26" height="18" rx="3" /><path d={`M${cx - 7},${cy - 8} L${cx + 7},${cy - 8}`} /></g>}
      {/* nariz */}
      {f.nose === 0 && <path d={`M${cx},${cy} L${cx - 5},${cy + 16} L${cx + 4},${cy + 17}`} stroke="rgba(0,0,0,.28)" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
      {f.nose === 1 && <ellipse cx={cx} cy={cy + 14} rx="7" ry="5" fill="rgba(0,0,0,.14)" />}
      {f.nose === 2 && <path d={`M${cx - 6},${cy + 16} Q${cx},${cy + 22} ${cx + 6},${cy + 16}`} stroke="rgba(0,0,0,.3)" strokeWidth="2.2" fill="none" />}
      {f.freckles && [...Array(8)].map((_, i) => <circle key={i} cx={cx - 26 + (i % 4) * 5 + (i > 3 ? 36 : 0)} cy={cy + 10 + (i % 2) * 4} r="1.3" fill="rgba(120,60,30,.55)" />)}
      {f.mole && <circle cx={cx + 22} cy={cy + 24} r="2.2" fill="#3b2414" />}
      {/* barba */}
      {f.beard === 1 && <path d={`M${cx - f.faceW + 6},${cy + 10} Q${cx},${cy + f.faceH + 22} ${cx + f.faceW - 6},${cy + 10} Q${cx},${cy + f.faceH - 4} ${cx - f.faceW + 6},${cy + 10}Z`} fill={f.hair} opacity=".9" />}
      {f.beard === 2 && <path d={`M${cx - 18},${cy + 26} Q${cx},${cy + 18} ${cx + 18},${cy + 26}`} stroke={f.hair} strokeWidth="6" fill="none" strokeLinecap="round" />}
      {f.beard === 3 && <path d={`M${cx - 30},${cy + 18} Q${cx},${cy + f.faceH + 10} ${cx + 30},${cy + 18}`} stroke={f.hair} strokeWidth="3" strokeDasharray="1 3" fill="none" opacity=".7" />}
      {/* boca */}
      {f.mouth === 0 && <path d={`M${cx - 12},${cy + 30} Q${cx},${cy + 40} ${cx + 12},${cy + 30}`} stroke="#7a2e2e" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {f.mouth === 1 && <path d={`M${cx - 10},${cy + 33} L${cx + 10},${cy + 33}`} stroke="#7a2e2e" strokeWidth="3" strokeLinecap="round" />}
      {f.mouth === 2 && <path d={`M${cx - 15},${cy + 29} Q${cx},${cy + 46} ${cx + 15},${cy + 29} Z`} fill="#6b1f2a" />}
      {f.mouth === 3 && <ellipse cx={cx} cy={cy + 33} rx="6" ry="4" fill="#7a2e2e" />}
    </svg>
  );
}

const lev = (a: string, b: string) => {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
};

function FacesGame({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 4 : clamp(level + 3, 4, 14);
  const typed = level >= 5;
  const people = useMemo(() => sample(NAMES, n).map((name) => ({ name, job: pick(JOBS), face: randomFace() })), [n]);
  const order = useMemo(() => shuffle([...people.keys()]), [people]);
  const [phase, setPhase] = useState<'study' | 'recall'>('study');
  const [idx, setIdx] = useState(0);
  const [val, setVal] = useState('');
  const [answer, setAnswer] = useState<{ ok: boolean; pickedName?: string } | null>(null);
  const correct = useRef(0);
  const perFace = 5;
  const left = useCountdown(perFace, phase === 'study', () => next(), idx);

  function next() {
    if (idx + 1 < n) setIdx(idx + 1);
    else {
      setIdx(0);
      setPhase('recall');
    }
  }
  const options = useMemo(() => {
    if (phase !== 'recall') return [];
    const p = people[order[idx]];
    const others = sample(people.filter((x) => x !== p).map((x) => x.name), 3);
    return shuffle([p.name, ...others]);
  }, [phase, idx, people, order]);

  const judge = (name: string) => {
    if (answer) return;
    const p = people[order[idx]];
    const ok = typed ? lev(norm(name), norm(p.name)) <= (p.name.length > 5 ? 1 : 0) : name === p.name;
    if (ok) correct.current++;
    feedback(ok);
    setAnswer({ ok, pickedName: name });
    setTimeout(() => {
      setAnswer(null);
      setVal('');
      if (idx + 1 < n) setIdx(idx + 1);
      else finish({ score: correct.current, accuracy: correct.current / n, summary: `${correct.current} de ${n} nombres recordados` });
    }, ok ? 700 : 1500);
  };

  if (phase === 'study') {
    const p = people[idx];
    return (
      <div className="flex flex-col items-center gap-4">
        <GameHud>
          <span>
            Estudio {idx + 1}/{n}
          </span>
          {/* el TimerRing se reinicia en cada rostro mediante key */}
          <span key={idx}>
            <TimerRing left={left} total={perFace} color={C.mem} size={38} />
          </span>
        </GameHud>
        <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-center gap-3">
          <FaceSvg f={p.face} size={200} />
          <div className="text-center">
            <div className="font-display text-3xl font-semibold text-ink-100">{p.name}</div>
            <div className="text-sm text-ink-400">{p.job}</div>
          </div>
        </motion.div>
        <p className="max-w-sm text-center text-xs text-ink-400">Busca un rasgo llamativo y conéctalo con una imagen del nombre (ej. «Rocío» → gotas de rocío en sus gafas).</p>
        <Button variant="outline" onClick={next}>
          Siguiente
        </Button>
      </div>
    );
  }
  const p = people[order[idx]];
  return (
    <div className="flex flex-col items-center gap-4">
      <GameHud>
        <span>
          Recuerdo {idx + 1}/{n}
        </span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      <FaceSvg f={p.face} size={180} />
      {typed ? (
        <form
          className="flex w-full max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (val.trim()) judge(val);
          }}
        >
          <input id="face-name" autoFocus autoComplete="off" className={inputCls} placeholder="¿Cómo se llama?" value={val} onChange={(e) => setVal(e.target.value)} disabled={!!answer} />
          <Button variant="primary" accent={C.mem} type="submit" disabled={!!answer}>
            OK
          </Button>
        </form>
      ) : (
        <div className="w-full max-w-md">
          <Choices options={options} disabled={!!answer} onPick={(o) => judge(o)} render={(o) => <span className="font-medium">{o}</span>} state={(o) => (!answer ? null : o === p.name ? 'ok' : o === answer.pickedName ? 'bad' : 'dim')} />
        </div>
      )}
      {answer && !answer.ok && typed && <div className="text-rose-300">Era {p.name}</div>}
    </div>
  );
}

export const faces: GameDef = {
  id: 'faces',
  name: 'Caras y nombres',
  domain: 'memoria',
  tagline: 'Asocia rostros con nombres como un mnemonista.',
  instructions: ['Fase de estudio: verás cada rostro con su nombre durante 5 s.', 'Fase de recuerdo: los rostros aparecen en otro orden; elige o escribe el nombre.', 'A partir del nivel 5 tendrás que escribirlo (se tolera una errata).'],
  why: 'Los nombres son arbitrarios y por eso se olvidan. La técnica de los campeones de memoria vincula un rasgo distintivo del rostro con una imagen concreta del nombre; esta elaboración profunda mejora el recuerdo frente a la simple repetición.',
  maxLevel: 12,
  scoreUnit: 'nombres',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 55 + level * 4, 0, 100),
  Component: FacesGame,
};
