import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, norm, pick, sample, scale, shuffle } from '../core/rng';
import { ANAGRAMS, CATEGORIES, VOCAB } from '../data/words';
import { C, Choices, useFinish } from './kit';
import { Button, GameHud, TimerRing, cx, inputCls, useCountdown } from '../components/ui';
import { getState, update } from '../core/store';
import { newCard } from '../core/srs';

// ─────────────────────────── Anagramas ───────────────────────────
const sortL = (w: string) => norm(w).split('').sort().join('');

function Anagram({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const secs = short ? 45 : 90;
  const band = clamp(Math.floor((level - 1) / 2), 0, ANAGRAMS.length - 1);
  const pool = useMemo(() => shuffle([...ANAGRAMS[band], ...(ANAGRAMS[band + 1] ?? []).slice(0, 6)]), [band]);
  const scramble = (w: string) => {
    let s = w;
    for (let k = 0; k < 20 && norm(s) === norm(w); k++) s = shuffle(w.split('')).join('');
    return s.toUpperCase();
  };
  const [idx, setIdx] = useState(0);
  const [scr, setScr] = useState(() => scramble(pool[0]));
  const [val, setVal] = useState('');
  const [running, setRunning] = useState(true);
  const [ok, setOk] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const left = useCountdown(secs, running, () => {
    setRunning(false);
    finish({ score: ok, accuracy: ok / Math.max(1, ok + skipped.length + 0.5) , metrics: { saltadas: skipped.length }, summary: `${ok} anagramas resueltos en ${secs} s` });
  });
  const next = () => {
    const n = (idx + 1) % pool.length;
    setIdx(n);
    setScr(scramble(pool[n]));
    setVal('');
  };
  const submit = () => {
    if (!val.trim()) return;
    const good = sortL(val) === sortL(pool[idx]) && (norm(val) === norm(pool[idx]) || ANAGRAMS.flat().some((w) => norm(w) === norm(val)));
    feedback(good);
    setFb(good ? 'ok' : 'bad');
    if (good) {
      setOk(ok + 1);
      next();
    }
  };
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>Resueltos: {ok}</span>
        <TimerRing left={left} total={secs} color={C.lan} />
      </GameHud>
      <motion.div key={scr} initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} className="mb-5 flex flex-wrap justify-center gap-1.5">
        {scr.split('').map((ch, i) => (
          <span key={i} className="flex h-12 w-10 items-center justify-center rounded-lg border border-lan/40 bg-lan/10 font-display text-2xl font-bold text-lan">
            {ch}
          </span>
        ))}
      </motion.div>
      <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), submit())}>
        <input id="anagram" autoFocus autoComplete="off" autoCapitalize="none" className={cx(inputCls, fb === 'bad' && 'border-rose-400/60')} value={val} onChange={(e) => (setVal(e.target.value), setFb(null))} placeholder="Escribe la palabra" />
        <Button type="submit" variant="primary" accent={C.lan}>OK</Button>
      </form>
      <div className="mt-3 flex justify-between text-xs text-ink-500">
        <span>{pool[idx].length} letras</span>
        <span>{skipped.length > 0 && <>La anterior era «{skipped[skipped.length - 1]}» · </>}<button className="underline-offset-2 hover:underline" onClick={() => (setSkipped([...skipped, pool[idx]]), next())}>Saltar</button></span>
      </div>
    </div>
  );
}

export const anagram: GameDef = {
  id: 'anagram',
  name: 'Anagramas',
  domain: 'lenguaje',
  tagline: 'Reordena las letras para formar la palabra.',
  instructions: ['Aparecen letras desordenadas: escribe la palabra que forman.', 'Resuelve todas las que puedas en 90 segundos.', 'Si te atascas, salta (verás la solución de la anterior).'],
  why: 'Resolver anagramas activa el acceso léxico y la manipulación de letras en memoria de trabajo. Buscar sílabas probables (prefijos, terminaciones comunes) es una estrategia que se automatiza con práctica.',
  maxLevel: 12,
  scoreUnit: 'palabras',
  higherBetter: true,
  normalize: (r, level) => clamp(scale(r.score, 2, 16) * 0.6 + level * 3.5, 0, 100),
  Component: Anagram,
};

// ─────────────────────────── Fluidez verbal ───────────────────────────
const LETTERS = 'ABCDEFGLMPRST'.split('');

function Fluency({ short, onFinish, level }: GameProps) {
  const finish = useFinish(onFinish);
  const secs = short ? 40 : 60;
  const task = useMemo(() => (Math.random() < 0.5 ? { kind: 'cat' as const, cat: pick(CATEGORIES) } : { kind: 'letter' as const, letter: pick(LETTERS) }), []);
  const [words, setWords] = useState<string[]>([]);
  const [val, setVal] = useState('');
  const [running, setRunning] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const known = useMemo(() => new Set(task.kind === 'cat' ? task.cat.words.map(norm) : CATEGORIES.flatMap((c) => c.words).map(norm)), [task]);
  const left = useCountdown(secs, running, () => {
    setRunning(false);
    setReview(true);
  });
  const add = () => {
    const w = norm(val);
    setVal('');
    if (w.length < 2) return;
    if (words.map(norm).includes(w)) return setErr('Ya la has dicho');
    if (task.kind === 'letter' && !w.startsWith(norm(task.letter))) return setErr(`Debe empezar por ${task.letter}`);
    setErr(null);
    setWords([val.trim().toLowerCase(), ...words]);
    feedback(true);
  };
  if (review) {
    const valid = words.filter((w) => !rejected.has(w));
    const verified = valid.filter((w) => known.has(norm(w))).length;
    return (
      <div className="mx-auto max-w-lg">
        <h3 className="font-display text-xl font-semibold">Revisión honesta</h3>
        <p className="mb-3 text-sm text-ink-400">Toca las palabras que no sean válidas para descartarlas. Las marcadas con ✓ están en el diccionario de NEXUS.</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {words.map((w) => (
            <button key={w} onClick={() => setRejected((r) => { const n = new Set(r); if (n.has(w)) n.delete(w); else n.add(w); return n; })} className={cx('rounded-full border px-3 py-1 text-sm', rejected.has(w) ? 'border-rose-400/40 text-rose-300 line-through' : 'border-white/10 bg-white/[.04] text-ink-100')}>
              {w} {known.has(norm(w)) && <span className="text-emerald-300">✓</span>}
            </button>
          ))}
          {!words.length && <span className="text-sm text-ink-500">No escribiste palabras.</span>}
        </div>
        <Button variant="primary" accent={C.lan} onClick={() => finish({ score: valid.length, accuracy: clamp(valid.length / (14 + level), 0, 1), metrics: { verificadas: verified, descartadas: rejected.size }, summary: `${valid.length} palabras válidas (${verified} verificadas) · ${task.kind === 'cat' ? task.cat.name : `letra ${task.letter}`}` })}>
          Confirmar {valid.length} palabras
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>Palabras: {words.length}</span>
        <TimerRing left={left} total={secs} color={C.lan} />
      </GameHud>
      <div className="mb-4 rounded-2xl border border-lan/30 bg-lan/10 p-4 text-center">
        <div className="text-xs uppercase tracking-[.16em] text-ink-400">{task.kind === 'cat' ? 'Categoría' : 'Palabras que empiecen por'}</div>
        <div className="font-display text-3xl font-bold text-lan">{task.kind === 'cat' ? task.cat.name : task.letter}</div>
      </div>
      <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), add())}>
        <input id="fluency" autoFocus autoComplete="off" autoCapitalize="none" className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Escribe y pulsa Enter" />
        <Button type="submit" variant="primary" accent={C.lan}>Añadir</Button>
      </form>
      {err && <div className="mt-2 text-sm text-amber-300">{err}</div>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {words.map((w) => (
          <motion.span key={w} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-full bg-white/[.06] px-3 py-1 text-sm">{w}</motion.span>
        ))}
      </div>
    </div>
  );
}

export const fluency: GameDef = {
  id: 'fluency',
  name: 'Fluidez verbal',
  domain: 'lenguaje',
  tagline: 'Todas las palabras que puedas en 60 segundos.',
  instructions: ['Recibirás una categoría (p. ej. animales) o una letra inicial.', 'Escribe tantas palabras distintas como puedas en 60 s.', 'Al final revisarás tu lista con honestidad y descartarás las no válidas.'],
  why: 'Las tareas de fluencia miden la velocidad de acceso al léxico y la búsqueda estratégica en memoria semántica. La estrategia experta es agrupar por subcategorías (animales de granja, de la selva…) y cambiar de grupo al agotarlo.',
  maxLevel: 10,
  scoreUnit: 'palabras',
  higherBetter: true,
  normalize: (r) => scale(r.score, 6, 30),
  Component: Fluency,
};

// ─────────────────────────── Vocabulario avanzado + SRS ───────────────────────────
function Vocab({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 6 : 12;
  const items = useMemo(() => {
    const words = sample(VOCAB, n);
    return words.map(([w, def]) => {
      const reverse = level >= 4 && Math.random() < 0.5;
      const others = sample(VOCAB.filter((x) => x[0] !== w), 3);
      return reverse ? { q: def, a: w, opts: shuffle([w, ...others.map((o) => o[0])]), w, def, reverse } : { q: w, a: def, opts: shuffle([def, ...others.map((o) => o[1])]), w, def, reverse };
    });
  }, [n, level]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = useRef(0);
  const added = useRef(0);
  const it = items[i];
  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      <div className="mb-1 text-xs uppercase tracking-[.16em] text-ink-400">{it.reverse ? '¿Qué palabra significa…?' : '¿Qué significa…?'}</div>
      <h3 className={cx('mb-4 font-display font-semibold', it.reverse ? 'text-xl' : 'text-3xl text-lan')}>{it.q}</h3>
      <Choices
        cols={1}
        options={it.opts}
        disabled={!!picked}
        state={(o) => (!picked ? null : o === it.a ? 'ok' : o === picked ? 'bad' : 'dim')}
        render={(o) => <span className="text-sm">{o}</span>}
        onPick={(o) => {
          const ok = o === it.a;
          if (ok) correct.current++;
          else {
            // las palabras falladas pasan al mazo SRS de vocabulario
            const s = getState();
            if (!s.cards.some((c) => c.deckId === 'vocab' && c.front === it.w)) {
              update((d) => void d.cards.push(newCard('vocab', it.w, it.def)));
              added.current++;
            }
          }
          feedback(ok);
          setPicked(o);
          setTimeout(() => {
            setPicked(null);
            if (i + 1 < n) setI(i + 1);
            else finish({ score: correct.current, accuracy: correct.current / n, metrics: { añadidasSRS: added.current }, summary: `${correct.current}/${n} correctas${added.current ? ` · ${added.current} palabras añadidas a tu mazo SRS` : ''}` });
          }, ok ? 700 : 1800);
        }}
      />
      {picked && picked !== it.a && <p className="mt-3 text-center text-xs text-ink-400">«{it.w}» se ha añadido a tu mazo «Vocabulario NEXUS» para repasarla con repetición espaciada.</p>}
    </div>
  );
}

export const vocab: GameDef = {
  id: 'vocab',
  name: 'Vocabulario avanzado',
  domain: 'lenguaje',
  tagline: 'Palabras cultas del español con repaso espaciado integrado.',
  instructions: ['Elige la definición correcta (o la palabra, en niveles altos).', 'Cada palabra que falles se añade automáticamente a tu mazo SRS «Vocabulario NEXUS».', 'Repásalas en el módulo de repetición espaciada.'],
  why: 'Un vocabulario amplio es uno de los mejores predictores de la inteligencia cristalizada. Combinar la prueba (efecto de testeo) con repaso espaciado de los errores es la forma más eficiente de fijar palabras nuevas.',
  maxLevel: 8,
  scoreUnit: 'aciertos',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 60 + level * 5, 0, 100),
  Component: Vocab,
};
