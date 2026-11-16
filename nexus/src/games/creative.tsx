import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, norm, pick, sample, scale, shuffle } from '../core/rng';
import { LATERAL, RAT } from '../data/words';
import { C, useFinish } from './kit';
import { Button, GameHud, TimerRing, cx, inputCls, useCountdown } from '../components/ui';
import { getState, update } from '../core/store';

// ─────────────────────────── Usos alternativos ───────────────────────────
const OBJECTS: { name: string; common: string[] }[] = [
  { name: 'un ladrillo', common: ['construir', 'pared', 'casa', 'muro', 'pisapapeles', 'arma', 'tirar', 'romper', 'calzar', 'tope'] },
  { name: 'un clip', common: ['sujetar', 'papeles', 'abrir', 'cerradura', 'ganzúa', 'gancho', 'limpiar', 'tarjeta sim', 'sim'] },
  { name: 'un periódico', common: ['leer', 'envolver', 'limpiar', 'cristales', 'fuego', 'encender', 'avión', 'gorro', 'pintar', 'suelo'] },
  { name: 'una cuchara', common: ['comer', 'remover', 'catapulta', 'medir', 'cavar', 'espejo', 'abrir', 'tambor', 'música'] },
  { name: 'una botella vacía', common: ['florero', 'jarrón', 'lámpara', 'maceta', 'rodillo', 'mensaje', 'regar', 'embudo', 'hucha'] },
  { name: 'un neumático viejo', common: ['columpio', 'maceta', 'asiento', 'muro', 'barrera', 'entrenar', 'flotador', 'mesa', 'parque'] },
  { name: 'un calcetín', common: ['marioneta', 'títere', 'limpiar', 'guardar', 'polvo', 'calentar', 'saco', 'bolsa', 'guante'] },
  { name: 'una cuerda', common: ['atar', 'saltar', 'tender', 'escalar', 'columpio', 'cinturón', 'medir', 'pescar', 'remolcar'] },
  { name: 'un paraguas', common: ['sol', 'lluvia', 'bastón', 'gancho', 'arma', 'defensa', 'tienda', 'secar', 'sombrilla'] },
  { name: 'una lata de conservas', common: ['maceta', 'lapicero', 'teléfono', 'tambor', 'hucha', 'farol', 'molde', 'cortar', 'vaso'] },
];

function AltUses({ short, onFinish, level }: GameProps) {
  const finish = useFinish(onFinish);
  const secs = short ? 50 : 90;
  const obj = useMemo(() => pick(OBJECTS), []);
  const [uses, setUses] = useState<{ t: string; orig: boolean }[]>([]);
  const [val, setVal] = useState('');
  const [running, setRunning] = useState(true);
  const [review, setReview] = useState(false);
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const left = useCountdown(secs, running, () => {
    setRunning(false);
    setReview(true);
  });
  const add = () => {
    const t = val.trim();
    setVal('');
    if (t.length < 3 || uses.some((u) => norm(u.t) === norm(t))) return;
    const orig = !obj.common.some((c) => norm(t).includes(norm(c)));
    setUses([{ t, orig }, ...uses]);
    feedback(true);
  };
  if (review) {
    const valid = uses.filter((_, k) => !rejected.has(k));
    const orig = valid.filter((u) => u.orig).length;
    const score = valid.length + orig;
    return (
      <div className="mx-auto max-w-lg">
        <h3 className="font-display text-xl font-semibold">Revisa tus ideas</h3>
        <p className="mb-3 text-sm text-ink-400">Descarta (tocando) las que no sean usos reales. Las ideas poco comunes (★) suman un punto extra de originalidad.</p>
        <div className="mb-4 space-y-1.5">
          {uses.map((u, k) => (
            <button key={k} onClick={() => setRejected((r) => { const n = new Set(r); if (n.has(k)) n.delete(k); else n.add(k); return n; })} className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm', rejected.has(k) ? 'bg-rose-400/10 text-rose-300 line-through' : 'bg-white/[.04]')}>
              <span>{u.t}</span>
              {u.orig && <span style={{ color: C.cre }}>★</span>}
            </button>
          ))}
        </div>
        <Button variant="primary" accent={C.cre} onClick={() => finish({ score, accuracy: clamp(score / (10 + level * 2), 0, 1), metrics: { fluidez: valid.length, originalidad: orig }, summary: `${valid.length} usos para ${obj.name} · ${orig} originales` })}>
          Confirmar ({score} puntos)
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>Ideas: {uses.length}</span>
        <TimerRing left={left} total={secs} color={C.cre} />
      </GameHud>
      <div className="mb-4 rounded-2xl border border-cre/30 bg-cre/10 p-4 text-center">
        <div className="text-xs uppercase tracking-[.16em] text-ink-400">¿Para qué más podrías usar…?</div>
        <div className="font-display text-3xl font-bold" style={{ color: C.cre }}>{obj.name}</div>
      </div>
      <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), add())}>
        <input id="altuses" autoFocus autoComplete="off" className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Describe un uso y pulsa Enter" />
        <Button type="submit" variant="primary" accent={C.cre}>Añadir</Button>
      </form>
      <div className="mt-3 space-y-1">
        {uses.map((u, k) => (
          <motion.div key={u.t} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex justify-between rounded-lg bg-white/[.04] px-3 py-1.5 text-sm">
            <span>{u.t}</span>
            {u.orig && <span style={{ color: C.cre }}>★</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export const altuses: GameDef = {
  id: 'altuses',
  name: 'Usos alternativos',
  domain: 'creatividad',
  tagline: 'Pensamiento divergente: ¿cuántos usos se te ocurren?',
  instructions: ['Verás un objeto cotidiano.', 'Escribe todos los usos distintos que se te ocurran en 90 s.', 'Puntúa la cantidad (fluidez) y las ideas poco habituales (originalidad).', 'Truco: cambia de propiedad (forma, peso, material, color) para saltar de categoría.'],
  why: 'La tarea de usos alternativos de Guilford mide el pensamiento divergente. Las primeras ideas suelen ser obvias; la originalidad aparece cuando sigues generando y cambias deliberadamente de perspectiva.',
  maxLevel: 10,
  scoreUnit: 'puntos',
  higherBetter: true,
  normalize: (r) => scale(r.score, 3, 25),
  Component: AltUses,
};

// ─────────────────────────── Asociaciones remotas ───────────────────────────
function Remote({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 4 : 8;
  const items = useMemo(() => {
    const maxL = clamp(Math.ceil(level / 2) + 1, 2, 5);
    const pool = RAT.filter((r) => r.level <= maxL && r.level >= Math.max(1, maxL - 2));
    return sample(pool.length >= n ? pool : RAT, n);
  }, [n, level]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [res, setRes] = useState<null | { ok: boolean; a: string }>(null);
  const [hint, setHint] = useState(false);
  const correct = useRef(0);
  const it = items[i];
  const per = 35;
  const left = useCountdown(per, !res, () => judge(''), i);
  function judge(ans: string) {
    if (res) return;
    const ok = !!ans && it.a.some((a) => norm(a) === norm(ans) || (norm(ans).length > 3 && norm(a).startsWith(norm(ans).slice(0, -1)) && Math.abs(norm(a).length - norm(ans).length) <= 2));
    if (ok) correct.current += hint ? 0.5 : 1;
    feedback(ok);
    setRes({ ok, a: it.a[0] });
    setTimeout(() => {
      setRes(null);
      setVal('');
      setHint(false);
      if (i + 1 < n) setI(i + 1);
      else finish({ score: correct.current, accuracy: correct.current / n, summary: `${correct.current}/${n} conexiones encontradas` });
    }, ok ? 1000 : 1900);
  }
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <TimerRing left={left} total={per} color={C.cre} />
      </GameHud>
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {it.cues.map((c) => (
          <span key={c} className="rounded-xl border border-cre/30 bg-cre/10 px-4 py-2 font-display text-xl font-semibold" style={{ color: C.cre }}>{c}</span>
        ))}
      </div>
      <p className="mb-3 text-center text-sm text-ink-400">¿Qué palabra conecta las tres?</p>
      <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), val.trim() && judge(val))}>
        <input id="rat" autoFocus autoComplete="off" className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} disabled={!!res} placeholder="Palabra de conexión" />
        <Button type="submit" variant="primary" accent={C.cre} disabled={!!res}>OK</Button>
      </form>
      <div className="mt-3 flex items-center justify-between text-sm">
        <button onClick={() => setHint(true)} disabled={hint || !!res} className="flex items-center gap-1 text-ink-400 hover:text-ink-200 disabled:opacity-50">
          <Lightbulb size={14} /> {hint ? `Empieza por «${it.a[0].charAt(0).toUpperCase()}» (${it.a[0].length} letras)` : 'Pista (vale medio punto)'}
        </button>
        <button onClick={() => judge('')} disabled={!!res} className="text-ink-500 hover:text-ink-300">Rendirse</button>
      </div>
      {res && <div className={cx('mt-4 rounded-xl p-3 text-center', res.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200')}>{res.ok ? '¡Conexión encontrada!' : `Una solución: «${res.a}»`}</div>}
    </div>
  );
}

export const rat: GameDef = {
  id: 'rat',
  name: 'Asociaciones remotas',
  domain: 'creatividad',
  tagline: 'Encuentra la palabra que une tres conceptos lejanos.',
  instructions: ['Verás tres palabras aparentemente sin relación.', 'Escribe la palabra que se asocia con las tres.', 'Tienes 35 s por trío; la pista cuesta medio punto.'],
  why: 'El test de asociaciones remotas (Mednick) mide el pensamiento convergente creativo: unir ideas alejadas. Las soluciones suelen llegar como «insight» repentino tras dejar de forzar la búsqueda obvia.',
  maxLevel: 8,
  scoreUnit: 'conexiones',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 55 + level * 5.5, 0, 100),
  Component: Remote,
};

// ─────────────────────────── Pensamiento lateral ───────────────────────────
function Lateral({ short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 2 : 4;
  const items = useMemo(() => {
    const seen = getState().flags;
    const idx = shuffle([...LATERAL.keys()]);
    const unseen = idx.filter((k) => !seen[`lat:${k}`]);
    const pickIdx = (unseen.length >= n ? unseen : idx).slice(0, n);
    return pickIdx.map((k) => ({ ...LATERAL[k], k }));
  }, [n]);
  useEffect(() => update((d) => items.forEach((x) => void (d.flags[`lat:${x.k}`] = true))), [items]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [hint, setHint] = useState(false);
  const [state, setState] = useState<null | 'ok' | 'reveal' | 'bad'>(null);
  const pts = useRef(0);
  const it = items[i];
  const next = () => {
    setVal('');
    setHint(false);
    setState(null);
    if (i + 1 < n) setI(i + 1);
    else finish({ score: pts.current, accuracy: pts.current / n, summary: `${pts.current}/${n} acertijos resueltos` });
  };
  const check = () => {
    const ok = it.keys.some((k) => norm(val).includes(norm(k)));
    feedback(ok);
    if (ok) {
      pts.current += hint ? 0.5 : 1;
      setState('ok');
    } else setState('bad');
  };
  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>Acertijo {i + 1}/{n}</span>
        <span>Puntos: {pts.current}</span>
      </GameHud>
      <p className="mb-4 rounded-2xl border border-white/[.07] bg-ink-900/60 p-5 text-lg leading-relaxed">{it.q}</p>
      {state === 'ok' || state === 'reveal' ? (
        <div>
          <div className={cx('rounded-xl p-3', state === 'ok' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/[.05] text-ink-200')}>
            <b>{state === 'ok' ? '¡Correcto! ' : 'Solución: '}</b>
            {it.a}
          </div>
          <Button className="mt-3" variant="primary" accent={C.cre} onClick={next}>{i + 1 < n ? 'Siguiente acertijo' : 'Terminar'}</Button>
        </div>
      ) : (
        <>
          <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), val.trim() && check())}>
            <input id="lateral" autoFocus autoComplete="off" className={inputCls} value={val} onChange={(e) => (setVal(e.target.value), setState(null))} placeholder="Tu explicación (palabras clave)" />
            <Button type="submit" variant="primary" accent={C.cre}>Comprobar</Button>
          </form>
          {state === 'bad' && <div className="mt-2 text-sm text-amber-300">No es eso (o prueba con otras palabras). Cuestiona tus suposiciones.</div>}
          <div className="mt-3 flex items-center justify-between text-sm">
            <button onClick={() => setHint(true)} disabled={hint} className="flex items-center gap-1 text-ink-400 hover:text-ink-200 disabled:opacity-60">
              <Lightbulb size={14} /> {hint ? it.hint : 'Pista (medio punto)'}
            </button>
            <button onClick={() => setState('reveal')} className="text-ink-500 hover:text-ink-300">Ver solución</button>
          </div>
        </>
      )}
    </div>
  );
}

export const lateral: GameDef = {
  id: 'lateral',
  name: 'Pensamiento lateral',
  domain: 'creatividad',
  tagline: 'Acertijos que exigen romper suposiciones.',
  instructions: ['Lee la situación: parece imposible, pero tiene una explicación sencilla.', 'Escribe la clave de la solución (se aceptan palabras clave).', 'Puedes pedir una pista o ver la solución.'],
  why: 'Estos acertijos atacan la «fijación funcional»: tendemos a interpretar el problema de la forma habitual. Entrenar el hábito de listar y cuestionar suposiciones es útil para resolver problemas reales.',
  maxLevel: 1,
  scoreUnit: 'acertijos',
  higherBetter: true,
  normalize: (r) => r.accuracy * 100,
  Component: Lateral,
};
