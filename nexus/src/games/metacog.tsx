import { useMemo, useRef, useState } from 'react';
import type { CalibrationPoint, GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, sample, shuffle } from '../core/rng';
import { TRIVIA } from '../data/trivia';
import { C, useFinish } from './kit';
import { Button, GameHud, cx } from '../components/ui';
import { update } from '../core/store';

/** Curva de calibración: confianza declarada frente a precisión real por intervalos. */
export function CalibrationChart({ points, size = 260 }: { points: { conf: number; correct: boolean }[]; size?: number }) {
  const bins = [0.25, 0.4, 0.55, 0.7, 0.85, 1.0001];
  const data = bins.slice(0, -1).map((lo, k) => {
    const hi = bins[k + 1];
    const ps = points.filter((p) => p.conf >= lo && p.conf < hi);
    return { x: (lo + Math.min(1, hi)) / 2, y: ps.length ? ps.filter((p) => p.correct).length / ps.length : null, n: ps.length };
  });
  const pad = 30;
  const S = (v: number) => pad + ((v - 0.2) / 0.8) * (size - pad * 1.5);
  const Y = (v: number) => size - pad - v * (size - pad * 1.5);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px]" role="img" aria-label="Curva de calibración">
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={pad} x2={size - pad / 2} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.06)" />
          <text x={pad - 5} y={Y(v) + 3} fontSize="9" textAnchor="end" fill="#6b7595">{Math.round(v * 100)}%</text>
        </g>
      ))}
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <text key={v} x={S(v)} y={size - pad + 14} fontSize="9" textAnchor="middle" fill="#6b7595">{Math.round(v * 100)}%</text>
      ))}
      <line x1={S(0.25)} y1={Y(0.25)} x2={S(1)} y2={Y(1)} stroke="rgba(255,255,255,.3)" strokeDasharray="4 3" />
      <polyline points={data.filter((d) => d.y !== null).map((d) => `${S(d.x)},${Y(d.y!)}`).join(' ')} fill="none" stroke={C.met} strokeWidth={2} />
      {data.map((d, k) => d.y !== null && <circle key={k} cx={S(d.x)} cy={Y(d.y)} r={3 + Math.min(5, d.n / 3)} fill={C.met} fillOpacity={0.8} />)}
      <text x={size / 2} y={size - 2} fontSize="9" textAnchor="middle" fill="#9aa3c0">Confianza declarada</text>
    </svg>
  );
}

const CONFS = [0.25, 0.5, 0.75, 0.9, 1];

function Calibration({ short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 6 : 15;
  const items = useMemo(() => sample(TRIVIA, n).map(([q, a, ...d]) => ({ q, a, opts: shuffle([a, ...d]) })), [n]);
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [conf, setConf] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const [end, setEnd] = useState(false);
  const pts = useRef<CalibrationPoint[]>([]);
  const it = items[i];
  const submit = () => {
    if (!choice || conf === null) return;
    const ok = choice === it.a;
    pts.current.push({ ts: Date.now(), conf, correct: ok, source: 'calibration' });
    feedback(ok);
    setShown(true);
  };
  const next = () => {
    setShown(false);
    setChoice(null);
    setConf(null);
    if (i + 1 < n) setI(i + 1);
    else {
      update((d) => void d.calibration.push(...pts.current));
      setEnd(true);
    }
  };
  if (end) {
    const p = pts.current;
    const acc = p.filter((x) => x.correct).length / p.length;
    const meanConf = p.reduce((s, x) => s + x.conf, 0) / p.length;
    const brier = p.reduce((s, x) => s + (x.conf - (x.correct ? 1 : 0)) ** 2, 0) / p.length;
    const bias = meanConf - acc;
    return (
      <div className="mx-auto grid max-w-2xl items-center gap-6 sm:grid-cols-2">
        <CalibrationChart points={p} />
        <div>
          <h3 className="font-display text-xl font-semibold">Tu calibración</h3>
          <p className="mt-2 text-sm text-ink-300">
            Precisión real <b>{Math.round(acc * 100)} %</b> · confianza media <b>{Math.round(meanConf * 100)} %</b>.
          </p>
          <p className="mt-2 text-sm text-ink-300">
            {Math.abs(bias) < 0.07 ? 'Estás bien calibrado: tu confianza refleja lo que sabes.' : bias > 0 ? `Tiendes al exceso de confianza (+${Math.round(bias * 100)} puntos). Antes de responder, pregúntate qué evidencia tienes.` : `Tiendes a infravalorarte (${Math.round(bias * 100)} puntos). Sabes más de lo que crees.`}
          </p>
          <p className="mt-2 text-xs text-ink-500">Puntuación de Brier: {brier.toFixed(3)} (0 = perfecto; 0,25 = azar respondiendo siempre 50 %). La diagonal punteada es la calibración perfecta.</p>
          <Button className="mt-4" variant="primary" accent={C.met} onClick={() => finish({ score: Math.round((1 - brier) * 100), accuracy: clamp(1 - Math.abs(bias) * 2.5, 0, 1), metrics: { precision: Math.round(acc * 100), confianza: Math.round(meanConf * 100), brier: Math.round(brier * 1000) / 1000 }, summary: `Precisión ${Math.round(acc * 100)} % vs confianza ${Math.round(meanConf * 100)} %` })}>
            Ver resultados
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span>Elige respuesta y confianza</span>
      </GameHud>
      <h3 className="mb-4 font-display text-xl font-semibold">{it.q}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {it.opts.map((o) => (
          <button key={o} disabled={shown} onClick={() => setChoice(o)} className={cx('min-h-[48px] rounded-xl border px-3 text-sm transition', shown && o === it.a ? 'border-emerald-400/70 bg-emerald-400/15' : shown && o === choice ? 'border-rose-400/70 bg-rose-400/15' : choice === o ? 'border-met/70 bg-white/10' : 'border-white/[.08] bg-white/[.03] hover:bg-white/[.07]')}>
            {o}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <div className="mb-2 text-xs uppercase tracking-[.14em] text-ink-400">¿Qué probabilidad hay de que aciertes?</div>
        <div className="grid grid-cols-5 gap-1.5">
          {CONFS.map((c) => (
            <button key={c} disabled={shown} onClick={() => setConf(c)} className={cx('h-11 rounded-lg border text-sm font-semibold tabular-nums transition', conf === c ? 'border-met bg-met/20 text-ink-100' : 'border-white/[.08] bg-white/[.03] text-ink-300 hover:bg-white/[.07]')}>
              {Math.round(c * 100)} %
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-ink-500">
          <span>Al azar</span>
          <span>Seguro</span>
        </div>
      </div>
      <div className="mt-4">
        {shown ? (
          <Button variant="primary" accent={C.met} onClick={next}>{i + 1 < n ? 'Siguiente' : 'Ver mi calibración'}</Button>
        ) : (
          <Button variant="primary" accent={C.met} disabled={!choice || conf === null} onClick={submit}>Responder</Button>
        )}
      </div>
    </div>
  );
}

export const calibration: GameDef = {
  id: 'calibration',
  name: 'Calibración de confianza',
  domain: 'metacognicion',
  tagline: '¿Sabes lo que sabes? Mide tu calibración.',
  instructions: ['Responde preguntas de cultura general de cuatro opciones.', 'Antes de confirmar, indica la probabilidad de acertar (25 % = al azar, 100 % = seguro).', 'Al final verás tu curva de calibración: lo ideal es que tu 75 % acierte el 75 % de las veces.'],
  why: 'La metacognición, saber cuánto sabes, guía el estudio: dedicas tiempo a lo que realmente no dominas. Recibir feedback sobre la propia confianza es de lo poco que mejora la calibración de forma fiable.',
  maxLevel: 1,
  scoreUnit: 'puntos (1 − Brier)',
  higherBetter: true,
  normalize: (r) => clamp(r.accuracy * 100, 0, 100),
  Component: Calibration,
};
