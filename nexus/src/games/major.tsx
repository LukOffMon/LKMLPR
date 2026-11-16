import { useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, pick, rand, shuffle } from '../core/rng';
import { C, Choices, NumPad, useFinish } from './kit';
import { Button, GameHud, Pill, cx, inputCls } from '../components/ui';
import { getState, update, useStore } from '../core/store';
import { MAJOR_TABLE, majorEncode } from '../data/major';
import { isUnlocked } from '../core/skills';

type Mode = 'n2w' | 'w2n' | 'pao';

function DictEditor() {
  const major = useStore((s) => s.major);
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-5">
        {MAJOR_TABLE.map((m) => (
          <div key={m.d} className="rounded-lg bg-white/[.04] px-2 py-1.5">
            <span className="mr-1 font-mono font-bold text-mem">{m.d}</span>
            <span className="text-ink-300">{m.sounds}</span>
          </div>
        ))}
      </div>
      <div className="grid max-h-[50vh] grid-cols-2 gap-1.5 overflow-auto pr-1 sm:grid-cols-4">
        {[...Array(100).keys()].map((i) => {
          const k = String(i).padStart(2, '0');
          const ok = majorEncode(major[k] ?? '') === k;
          return (
            <label key={k} className="flex items-center gap-2 rounded-lg bg-white/[.03] px-2 py-1">
              <span className="w-6 font-mono text-sm text-mem">{k}</span>
              <input
                id={`major-${k}`}
                className={cx('h-8 min-w-0 flex-1 rounded-md bg-transparent px-1 text-sm outline-none focus:bg-white/5', ok ? 'text-ink-100' : 'text-amber-300')}
                value={major[k] ?? ''}
                onChange={(e) => update((d) => void (d.major[k] = e.target.value))}
                title={ok ? 'Codificación correcta' : `Esta palabra codifica ${majorEncode(major[k] ?? '') || 'nada'}`}
              />
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-400">Las palabras en ámbar no codifican su número según las reglas fonéticas; puedes mantenerlas si te funcionan.</p>
    </div>
  );
}

function PaoEditor() {
  const pao = useStore((s) => s.pao);
  const [k, setK] = useState('');
  const keys = Object.keys(pao).sort();
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const key = k.padStart(2, '0').slice(-2);
          if (!/^\d\d$/.test(key)) return;
          update((d) => void (d.pao[key] = d.pao[key] ?? { p: '', a: '', o: '' }));
          setK('');
        }}
      >
        <input id="pao-new" className={cx(inputCls, 'w-28')} placeholder="00–99" value={k} onChange={(e) => setK(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        <Button type="submit">Añadir número</Button>
      </form>
      <div className="max-h-[50vh] space-y-1.5 overflow-auto pr-1">
        {keys.map((key) => (
          <div key={key} className="grid grid-cols-[2rem_1fr_1fr_1fr_auto] items-center gap-1.5">
            <span className="font-mono text-mem">{key}</span>
            {(['p', 'a', 'o'] as const).map((f) => (
              <input key={f} id={`pao-${key}-${f}`} className="h-8 min-w-0 rounded-md bg-white/[.04] px-2 text-sm outline-none focus:bg-white/10" placeholder={{ p: 'Persona', a: 'Acción', o: 'Objeto' }[f]} value={pao[key][f]} onChange={(e) => update((d) => void (d.pao[key][f] = e.target.value))} />
            ))}
            <button className="px-1 text-ink-500 hover:text-rose-300" onClick={() => update((d) => void delete d.pao[key])} aria-label={`Eliminar ${key}`}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Trainer({ level, short, onFinish, mode }: GameProps & { mode: Mode }) {
  const finish = useFinish(onFinish);
  const n = short ? 5 : 12;
  const s = getState();
  const digitsLen = level <= 2 ? 2 : level <= 4 ? 3 : level <= 6 ? 4 : 6;
  const paoKeys = Object.keys(s.pao).filter((k) => s.pao[k].p && s.pao[k].a && s.pao[k].o);
  const items = useMemo(
    () =>
      [...Array(n)].map(() => {
        if (mode === 'pao') {
          const [a, b, c] = [pick(paoKeys), pick(paoKeys), pick(paoKeys)];
          return { num: a + b + c, parts: [a, b, c] };
        }
        if (mode === 'w2n') {
          const k = String(rand(100)).padStart(2, '0');
          return { num: k, word: s.major[k] };
        }
        return { num: [...Array(digitsLen)].map(() => rand(10)).join('') };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [n, mode],
  );
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [res, setRes] = useState<null | { ok: boolean; msg: string }>(null);
  const correct = useRef(0);
  const times = useRef<number[]>([]);
  const t0 = useRef(performance.now());
  const it = items[i];

  const paoOpts = useMemo(() => {
    if (mode !== 'pao') return [];
    const P = s.pao;
    const [a, b, c] = it.parts!;
    const right = `${P[a].p} · ${P[b].a} · ${P[c].o}`;
    const wrongs = new Set<string>();
    let guard = 0;
    while (wrongs.size < 3 && guard++ < 50) {
      const sw = [a, b, c].map((x) => (Math.random() < 0.5 ? pick(paoKeys) : x));
      const w = `${P[sw[0]].p} · ${P[sw[1]].a} · ${P[sw[2]].o}`;
      if (w !== right) wrongs.add(w);
    }
    return shuffle([right, ...wrongs]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, mode]);

  const judge = (ok: boolean, msg: string) => {
    times.current.push(performance.now() - t0.current);
    if (ok) correct.current++;
    feedback(ok);
    setRes({ ok, msg });
    setTimeout(() => {
      setRes(null);
      setVal('');
      t0.current = performance.now();
      if (i + 1 < n) setI(i + 1);
      else {
        const avg = times.current.reduce((x, y) => x + y, 0) / times.current.length / 1000;
        finish({ score: correct.current, accuracy: correct.current / n, metrics: { segundosMedia: Math.round(avg * 10) / 10 }, summary: `${correct.current}/${n} correctas · ${avg.toFixed(1)} s por elemento` });
      }
    }, ok ? 700 : 1800);
  };

  const submitWord = () => {
    if (!val.trim() || res) return;
    const enc = val.split(/\s+/).map(majorEncode).join('');
    const hint = it.num.match(/.{1,2}/g)!.map((p) => (p.length === 2 ? s.major[p] : '')).filter(Boolean).join(' + ');
    judge(enc === it.num, enc === it.num ? `«${val}» = ${enc}` : `«${val}» codifica ${enc || 'nada'}. Sugerencia: ${hint}`);
  };

  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>
          {i + 1}/{n}
        </span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      {mode === 'n2w' && (
        <div className="flex flex-col items-center gap-4">
          <div className="font-mono text-6xl font-bold tracking-[.2em]" style={{ color: C.mem }}>
            {it.num}
          </div>
          <p className="text-sm text-ink-400">Escribe una o varias palabras que codifiquen el número.</p>
          <form className="flex w-full gap-2" onSubmit={(e) => (e.preventDefault(), submitWord())}>
            <input id="major-word" autoFocus autoComplete="off" className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} placeholder="p. ej. rata moto" disabled={!!res} />
            <Button type="submit" variant="primary" accent={C.mem} disabled={!!res}>
              OK
            </Button>
          </form>
          {val && !res && <div className="font-mono text-xs text-ink-400">Codificación en vivo: {val.split(/\s+/).map(majorEncode).join('') || '—'}</div>}
        </div>
      )}
      {mode === 'w2n' && (
        <div className="flex flex-col items-center gap-4">
          <div className="font-display text-5xl font-semibold" style={{ color: C.mem }}>
            {it.word}
          </div>
          <div className="h-10 font-mono text-3xl tracking-[.3em]">{val || <span className="text-ink-600">··</span>}</div>
          <NumPad value={val} onChange={setVal} onSubmit={() => val && !res && judge(val === majorEncode(it.word!) || val === it.num, `«${it.word}» = ${it.num}`)} disabled={!!res} color={C.mem} />
        </div>
      )}
      {mode === 'pao' && (
        <div className="flex flex-col items-center gap-4">
          <div className="font-mono text-5xl font-bold tracking-[.15em]" style={{ color: C.mem }}>
            {it.parts!.join(' ')}
          </div>
          <p className="text-sm text-ink-400">Elige la imagen PAO: persona del 1.º par, acción del 2.º, objeto del 3.º.</p>
          <div className="w-full">
            <Choices cols={1} options={paoOpts} disabled={!!res} render={(o) => <span className="text-sm">{o}</span>} onPick={(o) => judge(o === paoOpts.find((x) => x === `${s.pao[it.parts![0]].p} · ${s.pao[it.parts![1]].a} · ${s.pao[it.parts![2]].o}`), `${s.pao[it.parts![0]].p} · ${s.pao[it.parts![1]].a} · ${s.pao[it.parts![2]].o}`)} />
          </div>
        </div>
      )}
      {res && <div className={cx('mt-4 rounded-xl p-3 text-center text-sm', res.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200')}>{res.msg}</div>}
    </div>
  );
}

function MajorModule(p: GameProps) {
  const [tab, setTab] = useState<'train' | 'dict' | 'pao'>('train');
  const [mode, setMode] = useState<Mode | null>(null);
  const paoOk = useStore((s) => isUnlocked(s, 'pao'));
  const paoCount = useStore((s) => Object.values(s.pao).filter((x) => x.p && x.a && x.o).length);
  if (mode) return <Trainer {...p} mode={mode} />;
  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl bg-white/[.04] p-1">
        {(
          [
            ['train', 'Entrenar'],
            ['dict', 'Diccionario 00–99'],
            ['pao', 'Tabla PAO'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('flex-1 rounded-lg py-2 text-sm font-medium transition', tab === k ? 'bg-white/10 text-ink-100' : 'text-ink-400 hover:text-ink-200')}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'dict' && <DictEditor />}
      {tab === 'pao' && <PaoEditor />}
      {tab === 'train' && (
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['n2w', 'Número → palabra', 'Codifica números en palabras imaginables.'],
              ['w2n', 'Palabra → número', 'Decodifica palabras de tu diccionario.'],
              ['pao', 'Sistema PAO', '6 dígitos en una sola imagen Persona-Acción-Objeto.'],
            ] as const
          ).map(([m, t, d]) => {
            const locked = m === 'pao' && (!paoOk || paoCount < 4);
            return (
              <button key={m} disabled={locked} onClick={() => setMode(m)} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4 text-left transition hover:border-mem/50 hover:bg-white/[.06] disabled:opacity-50">
                <div className="mb-1 flex items-center gap-2 font-display font-semibold text-ink-100">
                  {t} {locked && <Lock size={14} />}
                </div>
                <div className="text-sm text-ink-400">{d}</div>
                {locked && <div className="mt-2"><Pill color={C.mem}>Se desbloquea dominando el Sistema Mayor</Pill></div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const major: GameDef = {
  id: 'major',
  name: 'Sistema Mayor y PAO',
  domain: 'memoria',
  tagline: 'Convierte números en imágenes inolvidables.',
  instructions: ['Cada dígito corresponde a sonidos consonánticos (0 = s/z, 1 = t/d, 2 = n, 3 = m, 4 = r, 5 = l, 6 = ch/j, 7 = k/g, 8 = f/v, 9 = p/b).', 'Las vocales, la h y la w no cuentan: rellena con ellas para formar palabras.', 'Elige un modo de entrenamiento; puedes editar tu diccionario 00–99 y tu tabla PAO.', 'Al dominar el Sistema Mayor se desbloquea el modo PAO.'],
  why: 'Los números son abstractos y difíciles de recordar; las imágenes concretas no. El Sistema Mayor traduce dígitos a palabras visualizables que luego pueden colocarse en un palacio de la memoria. Los campeones de memoria usan variantes (PAO) para codificar 6 dígitos en una sola escena.',
  maxLevel: 8,
  scoreUnit: 'aciertos',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 60 + level * 5, 0, 100),
  Component: MajorModule,
  tool: true,
};
