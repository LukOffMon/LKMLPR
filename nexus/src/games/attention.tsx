import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { speakStimulus, sfx } from '../core/audio';
import { chance, clamp, median, pick, rand, scale, shuffle, sleep } from '../core/rng';
import { C, GetReady, useFinish } from './kit';
import { GameHud, Kbd, TimerRing, cx, useCountdown, useKey } from '../components/ui';

// ─────────────────────────── Dual N-Back ───────────────────────────
function NBack({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const N = level;
  const total = (short ? 14 : 20) + N;
  const seq = useMemo(() => {
    const pos: number[] = [], snd: number[] = [];
    for (let i = 0; i < total; i++) {
      pos.push(i >= N && chance(0.3) ? pos[i - N] : rand(9));
      snd.push(i >= N && chance(0.3) ? snd[i - N] : rand(8));
    }
    return { pos, snd };
  }, [N, total]);
  const [started, setStarted] = useState(false);
  const [t, setT] = useState(-1);
  const [lit, setLit] = useState<number | null>(null);
  const resp = useRef<{ p: boolean; s: boolean }[]>([]);
  const [flash, setFlash] = useState<{ p?: 'ok' | 'bad'; s?: 'ok' | 'bad' }>({});
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const loop = async () => {
      while (alive.current && i < total) {
        resp.current[i] = { p: false, s: false };
        setT(i);
        setFlash({});
        setLit(seq.pos[i]);
        speakStimulus(seq.snd[i]);
        await sleep(600);
        setLit(null);
        await sleep(2200);
        i++;
      }
      if (!alive.current) return;
      // puntuación
      let hp = 0, mp = 0, fp = 0, hs = 0, ms = 0, fs = 0;
      for (let k = N; k < total; k++) {
        const isP = seq.pos[k] === seq.pos[k - N];
        const isS = seq.snd[k] === seq.snd[k - N];
        const r = resp.current[k];
        if (isP && r.p) hp++; else if (isP) mp++; else if (r.p) fp++;
        if (isS && r.s) hs++; else if (isS) ms++; else if (r.s) fs++;
      }
      const ap = hp / Math.max(1, hp + mp + fp);
      const as = hs / Math.max(1, hs + ms + fs);
      const acc = (ap + as) / 2;
      const next = acc >= 0.8 ? N + 1 : acc < 0.5 ? N - 1 : N;
      finish({ score: Math.round(acc * 100), accuracy: acc, nextLevel: clamp(next, 1, 9), metrics: { N, posicion: Math.round(ap * 100), sonido: Math.round(as * 100), falsasAlarmas: fp + fs }, summary: `Dual ${N}-Back · posición ${Math.round(ap * 100)} % · sonido ${Math.round(as * 100)} %` });
    };
    void loop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const answer = (m: 'p' | 's') => {
    if (t < 0 || !resp.current[t] || resp.current[t][m]) return;
    resp.current[t][m] = true;
    if (t >= N) {
      const ok = m === 'p' ? seq.pos[t] === seq.pos[t - N] : seq.snd[t] === seq.snd[t - N];
      setFlash((f) => ({ ...f, [m]: ok ? 'ok' : 'bad' }));
      feedback(ok);
    }
  };
  useKey((e) => {
    if (e.key === 'a' || e.key === 'A') answer('p');
    if (e.key === 'l' || e.key === 'L') answer('s');
  }, [t]);

  if (!started) return <GetReady onDone={() => setStarted(true)} label={`Dual ${N}-Back`} />;
  return (
    <div className="mx-auto max-w-md">
      <GameHud>
        <span className="font-mono">N = {N}</span>
        <span>
          {Math.max(0, t + 1)}/{total}
        </span>
      </GameHud>
      <div className="mx-auto grid aspect-square w-full max-w-[320px] grid-cols-3 gap-2">
        {[...Array(9).keys()].map((i) => (
          <div key={i} className="rounded-xl border transition-all duration-100" style={i === 4 ? { borderColor: 'transparent' } : { background: lit === i ? C.att : 'rgba(34,211,238,.06)', borderColor: lit === i ? '#a5f3fc' : 'rgba(34,211,238,.18)', boxShadow: lit === i ? `0 0 28px ${C.att}` : undefined }}>
            {i === 4 && <div className="flex h-full items-center justify-center text-ink-600">+</div>}
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {(
          [
            ['p', 'Posición', 'A'],
            ['s', 'Sonido', 'L'],
          ] as const
        ).map(([m, l, k]) => (
          <button key={m} onClick={() => answer(m)} className={cx('h-16 rounded-xl border text-sm font-semibold transition active:scale-95', flash[m] === 'ok' ? 'border-emerald-400 bg-emerald-400/20' : flash[m] === 'bad' ? 'border-rose-400 bg-rose-400/20' : 'border-white/10 bg-white/[.05] hover:bg-white/10')}>
            {l} <Kbd>{k}</Kbd>
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">Pulsa cuando el estímulo coincida con el de hace {N} {N === 1 ? 'paso' : 'pasos'}.</p>
    </div>
  );
}

export const nback: GameDef = {
  id: 'nback',
  name: 'Dual N-Back',
  domain: 'atencion',
  tagline: 'Posición y sonido a la vez: la prueba reina de memoria de trabajo.',
  instructions: ['En cada paso se ilumina una casilla y suena una letra (o una nota).', 'Pulsa «Posición» (A) si la casilla coincide con la de N pasos atrás.', 'Pulsa «Sonido» (L) si la letra coincide con la de N pasos atrás.', 'Si superas el 80 %, N sube; por debajo del 50 %, baja.'],
  why: 'El dual n-back exige mantener y actualizar continuamente dos flujos de información, cargando al máximo la memoria de trabajo. La evidencia muestra mejoras claras en la propia tarea y en tareas parecidas; la transferencia a la inteligencia general es discutida, así que úsalo como entrenamiento de memoria de trabajo, no como atajo al CI.',
  keys: 'A = posición · L = sonido',
  maxLevel: 9,
  scoreUnit: '%',
  higherBetter: true,
  normalize: (r, level) => clamp((level - 1) * 17 + r.accuracy * 30, 0, 100),
  Component: NBack,
  minutes: 3,
};

// ─────────────────────────── Seguimiento de múltiples objetos ───────────────────────────
function MOT({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const k = clamp(2 + Math.floor((level - 1) / 2), 2, 7);
  const nBalls = clamp(k * 2 + 2 + Math.floor(level / 3), 6, 16);
  const speed = 0.18 + level * 0.025;
  const rounds = short ? 3 : 6;
  const ref = useRef<HTMLCanvasElement>(null);
  const balls = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'cue' | 'move' | 'pick' | 'fb'>('cue');
  const [targets, setTargets] = useState<Set<number>>(new Set());
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const score = useRef({ hits: 0, total: 0 });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const setup = () => {
    balls.current = [...Array(nBalls)].map(() => {
      const a = Math.random() * Math.PI * 2;
      return { x: 0.08 + Math.random() * 0.84, y: 0.08 + Math.random() * 0.84, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
    });
    setTargets(new Set(shuffle([...Array(nBalls).keys()]).slice(0, k)));
    setPicked(new Set());
    setPhase('cue');
    setTimeout(() => setPhase('move'), 2200);
    setTimeout(() => setPhase('pick'), 2200 + 6000);
  };
  useEffect(setup, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    const R = 0.035;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = cv.clientWidth, H = cv.clientHeight;
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (cv.width !== W * dpr) {
        cv.width = W * dpr;
        cv.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const bs = balls.current;
      if (phaseRef.current === 'move') {
        for (const b of bs) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < R || b.x > 1 - R) b.vx *= -1;
          if (b.y < R || b.y > 1 - R) b.vy *= -1;
          b.x = clamp(b.x, R, 1 - R);
          b.y = clamp(b.y, R, 1 - R);
          if (Math.random() < 0.01) {
            const a = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 1.2;
            b.vx = Math.cos(a) * speed;
            b.vy = Math.sin(a) * speed;
          }
        }
        for (let i = 0; i < bs.length; i++)
          for (let j = i + 1; j < bs.length; j++) {
            const a = bs[i], b = bs[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.hypot(dx, dy);
            if (d < R * 2 && d > 0) {
              [a.vx, b.vx] = [b.vx, a.vx];
              [a.vy, b.vy] = [b.vy, a.vy];
              const push = (R * 2 - d) / 2;
              a.x -= (dx / d) * push; a.y -= (dy / d) * push; b.x += (dx / d) * push; b.y += (dy / d) * push;
            }
          }
      }
      bs.forEach((b, i) => {
        const isT = targetsRef.current.has(i);
        const ph = phaseRef.current;
        let col = '#38415f';
        if (ph === 'cue' && isT) col = C.att;
        if (ph === 'pick' && pickedRef.current.has(i)) col = '#e7eaf3';
        if (ph === 'fb') col = isT ? (pickedRef.current.has(i) ? '#34d399' : C.att) : pickedRef.current.has(i) ? '#fb7185' : '#38415f';
        ctx.beginPath();
        ctx.arc(b.x * W, b.y * H, R * Math.min(W, H), 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = col === '#38415f' ? 0 : 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  const click = (e: React.PointerEvent) => {
    if (phase !== 'pick') return;
    const r = ref.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    let best = -1, bd = 1;
    balls.current.forEach((b, i) => {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < bd) { bd = d; best = i; }
    });
    if (best < 0 || bd > 0.08) return;
    const p = new Set(picked);
    if (p.has(best)) p.delete(best); else p.add(best);
    setPicked(p);
    sfx.click();
    if (p.size === k) {
      const hits = [...p].filter((i) => targets.has(i)).length;
      score.current.hits += hits;
      score.current.total += k;
      feedback(hits === k);
      setPhase('fb');
      setTimeout(() => {
        if (round + 1 >= rounds) {
          const acc = score.current.hits / score.current.total;
          finish({ score: score.current.hits, accuracy: acc, metrics: { objetivos: k, distractores: nBalls - k }, summary: `${score.current.hits}/${score.current.total} objetivos seguidos (${k} a la vez)` });
        } else setRound(round + 1);
      }, 1400);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>Ronda {round + 1}/{rounds}</span>
        <span className={phase === 'cue' ? 'text-att' : ''}>{phase === 'cue' ? `Memoriza las ${k} bolas iluminadas` : phase === 'move' ? 'Síguelas con la mirada…' : phase === 'pick' ? `Selecciona ${k} (${picked.size}/${k})` : ''}</span>
      </GameHud>
      <canvas ref={ref} onPointerDown={click} className="aspect-square w-full touch-none rounded-2xl border border-white/[.08] bg-ink-900/70" aria-label="Campo de seguimiento de objetos" />
    </div>
  );
}

export const mot: GameDef = {
  id: 'mot',
  name: 'Seguimiento de objetos',
  domain: 'atencion',
  tagline: 'Sigue varias bolas en movimiento entre distractores.',
  instructions: ['Algunas bolas se iluminan: son tus objetivos.', 'Todas se vuelven iguales y se mueven durante 6 s.', 'Cuando se detengan, selecciona las que eran objetivos.'],
  why: 'El seguimiento de múltiples objetos (MOT) mide la atención dividida y sostenida. Es una tarea usada en investigación con deportistas de élite; la dificultad sube aumentando objetivos, distractores y velocidad.',
  maxLevel: 12,
  scoreUnit: 'objetivos',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 50 + level * 5, 0, 100),
  Component: MOT,
};

// ─────────────────────────── Flanker ───────────────────────────
function Flanker({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 16 : 36;
  const deadline = clamp(1600 - level * 90, 550, 1600);
  const trials = useMemo(() => [...Array(n)].map(() => ({ dir: chance(0.5) ? 1 : -1, cong: chance(0.5) })), [n]);
  const [i, setI] = useState(-1);
  const [show, setShow] = useState(false);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const t0 = useRef(0);
  const data = useRef<{ ok: boolean; rt: number; cong: boolean }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const next = (k: number) => {
    if (k >= n) {
      const d = data.current;
      const ok = d.filter((x) => x.ok);
      const rtC = median(ok.filter((x) => x.cong).map((x) => x.rt));
      const rtI = median(ok.filter((x) => !x.cong).map((x) => x.rt));
      const rt = Math.round(median(ok.map((x) => x.rt)));
      finish({ score: rt || deadline, accuracy: ok.length / n, metrics: { interferencia: Math.round(rtI - rtC), rtMediana: rt }, summary: `TR mediano ${rt} ms · efecto de interferencia ${Math.round(rtI - rtC)} ms` });
      return;
    }
    setI(k);
    setShow(false);
    setFb(null);
    setTimeout(() => {
      setShow(true);
      t0.current = performance.now();
      timer.current = setTimeout(() => respond(0, k), deadline);
    }, 450 + rand(400));
  };
  const respond = (dir: number, k = i) => {
    if (!show && dir !== 0) return;
    if (data.current[k]) return;
    clearTimeout(timer.current);
    const tr = trials[k];
    const ok = dir === tr.dir;
    data.current[k] = { ok, rt: performance.now() - t0.current, cong: tr.cong };
    feedback(ok);
    setFb(ok ? 'ok' : 'bad');
    setShow(false);
    setTimeout(() => next(k + 1), 350);
  };
  useKey((e) => {
    if (e.key === 'ArrowLeft') respond(-1);
    if (e.key === 'ArrowRight') respond(1);
  }, [show, i]);
  if (i < 0) return <GetReady onDone={() => next(0)} />;
  const tr = trials[i];
  const c = tr.dir > 0 ? '→' : '←';
  const f = tr.cong ? c : tr.dir > 0 ? '←' : '→';
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span className="font-mono">Límite {deadline} ms</span>
      </GameHud>
      <div className={cx('flex h-40 items-center justify-center rounded-2xl border font-mono text-6xl tracking-[.25em] transition', fb === 'ok' ? 'border-emerald-400/40' : fb === 'bad' ? 'border-rose-400/40' : 'border-white/[.06]')} style={{ color: C.att }}>
        {show ? `${f}${f}${c}${f}${f}` : <span className="text-2xl text-ink-600">+</span>}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onPointerDown={() => respond(-1)} className="h-16 rounded-xl border border-white/10 bg-white/[.05] text-3xl active:scale-95" aria-label="Izquierda">←</button>
        <button onPointerDown={() => respond(1)} className="h-16 rounded-xl border border-white/10 bg-white/[.05] text-3xl active:scale-95" aria-label="Derecha">→</button>
      </div>
    </div>
  );
}

export const flanker: GameDef = {
  id: 'flanker',
  name: 'Tarea Flanker',
  domain: 'atencion',
  tagline: 'Ignora los distractores y responde a la flecha central.',
  instructions: ['Aparecerán cinco flechas.', 'Responde SOLO a la dirección de la flecha central (← / →).', 'Las flechas laterales a veces apuntan al lado contrario: ignóralas.', 'El tiempo límite se reduce al subir de nivel.'],
  why: 'La tarea de Eriksen mide el control atencional: la capacidad de filtrar información irrelevante. La diferencia de tiempo entre ensayos congruentes e incongruentes (efecto de interferencia) indica cuánto te distraen los estímulos competidores.',
  keys: '← / →',
  maxLevel: 12,
  scoreUnit: 'ms',
  higherBetter: false,
  normalize: (r) => clamp(scale(1000 - r.score, 300, 700) * r.accuracy, 0, 100),
  Component: Flanker,
};

// ─────────────────────────── Go / No-Go ───────────────────────────
function GoNoGo({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const n = short ? 20 : 40;
  const win = clamp(900 - level * 50, 380, 900);
  const trials = useMemo(() => [...Array(n)].map(() => chance(0.72)), [n]);
  const [i, setI] = useState(-1);
  const [show, setShow] = useState(false);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const d = useRef<{ ok: boolean; rt?: number; go: boolean }[]>([]);
  const t0 = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const next = (k: number) => {
    if (k >= n) {
      const ok = d.current.filter((x) => x.ok).length;
      const comm = d.current.filter((x) => !x.go && !x.ok).length;
      const rts = d.current.filter((x) => x.go && x.ok && x.rt).map((x) => x.rt!);
      const rt = Math.round(median(rts));
      finish({ score: Math.round((ok / n) * 100), accuracy: ok / n, metrics: { comision: comm, rtMediana: rt }, summary: `${comm} errores de impulsividad · TR ${rt} ms` });
      return;
    }
    setI(k);
    setFb(null);
    setShow(false);
    setTimeout(() => {
      setShow(true);
      t0.current = performance.now();
      timer.current = setTimeout(() => end(k, false), win);
    }, 350 + rand(500));
  };
  const end = (k: number, pressed: boolean) => {
    if (d.current[k]) return;
    clearTimeout(timer.current);
    const go = trials[k];
    const ok = go === pressed;
    d.current[k] = { ok, go, rt: pressed ? performance.now() - t0.current : undefined };
    if (pressed || !ok || !go) feedback(ok);
    setFb(ok ? 'ok' : 'bad');
    setShow(false);
    setTimeout(() => next(k + 1), 300);
  };
  const press = () => show && end(i, true);
  useKey((e) => {
    if (e.key === ' ') {
      e.preventDefault();
      press();
    }
  }, [show, i]);
  if (i < 0) return <GetReady onDone={() => next(0)} />;
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>{i + 1}/{n}</span>
        <span>Verde = pulsa · Rojo = no pulses</span>
      </GameHud>
      <button onPointerDown={press} className={cx('flex h-64 w-full items-center justify-center rounded-2xl border bg-ink-900/60', fb === 'bad' ? 'border-rose-400/50' : 'border-white/[.06]')} aria-label="Zona de respuesta">
        {show && <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="h-28 w-28 rounded-full" style={{ background: trials[i] ? '#34d399' : '#fb7185', boxShadow: `0 0 50px ${trials[i] ? '#34d399' : '#fb7185'}` }} />}
      </button>
      <p className="mt-3 text-center text-xs text-ink-500">
        Toca la zona o pulsa <Kbd>Espacio</Kbd>
      </p>
    </div>
  );
}

export const gonogo: GameDef = {
  id: 'gonogo',
  name: 'Go / No-Go',
  domain: 'atencion',
  tagline: 'Responde rápido… pero frena cuando toca.',
  instructions: ['Círculo verde: pulsa lo antes posible.', 'Círculo rojo: no pulses.', 'Los verdes son mucho más frecuentes, así que tu impulso será pulsar siempre.'],
  why: 'Esta tarea mide el control inhibitorio: detener una respuesta automática. Los errores de comisión (pulsar en rojo) reflejan impulsividad; entrenar la inhibición es clave para la autorregulación.',
  keys: 'Espacio',
  maxLevel: 12,
  scoreUnit: '%',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 70 + level * 3, 0, 100),
  Component: GoNoGo,
};

// ─────────────────────────── Stroop ───────────────────────────
const SC = [
  { name: 'ROJO', color: '#f43f5e' },
  { name: 'AZUL', color: '#3b82f6' },
  { name: 'VERDE', color: '#22c55e' },
  { name: 'AMARILLO', color: '#facc15' },
];

function Stroop({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const secs = short ? 25 : 45;
  const pInc = clamp(0.4 + level * 0.05, 0.4, 0.85);
  const gen = () => {
    const ink = rand(4);
    const word = chance(pInc) ? pick([0, 1, 2, 3].filter((x) => x !== ink)) : ink;
    return { ink, word, t: performance.now() };
  };
  const [cur, setCur] = useState(gen);
  const [running, setRunning] = useState(false);
  const [ok, setOk] = useState(0);
  const [tot, setTot] = useState(0);
  const [fb, setFb] = useState<'ok' | 'bad' | null>(null);
  const rts = useRef<{ rt: number; inc: boolean }[]>([]);
  const left = useCountdown(secs, running, () => {
    const inc = median(rts.current.filter((x) => x.inc).map((x) => x.rt));
    const con = median(rts.current.filter((x) => !x.inc).map((x) => x.rt));
    finish({ score: ok, accuracy: tot ? ok / tot : 0, metrics: { efectoStroop: Math.round(inc - con), respuestas: tot }, summary: `${ok} correctas en ${secs} s · efecto Stroop ${Math.round(inc - con)} ms` });
  });
  const answer = (c: number) => {
    if (!running) return;
    const good = c === cur.ink;
    if (good) {
      setOk((x) => x + 1);
      rts.current.push({ rt: performance.now() - cur.t, inc: cur.ink !== cur.word });
    }
    setTot((x) => x + 1);
    feedback(good);
    setFb(good ? 'ok' : 'bad');
    setCur(gen());
  };
  useKey((e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) answer(n - 1);
  }, [cur, running]);
  if (!running) return <GetReady onDone={() => (setRunning(true), setCur(gen()))} />;
  return (
    <div className="mx-auto max-w-lg">
      <GameHud>
        <span>Correctas: {ok}</span>
        <TimerRing left={left} total={secs} color={C.att} />
      </GameHud>
      <div className={cx('flex h-40 items-center justify-center rounded-2xl border bg-ink-900/60', fb === 'bad' ? 'border-rose-400/40' : 'border-white/[.06]')}>
        <motion.div key={cur.t} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-5xl font-bold tracking-wide" style={{ color: SC[cur.ink].color }}>
          {SC[cur.word].name}
        </motion.div>
      </div>
      <p className="my-3 text-center text-sm text-ink-400">¿De qué COLOR está escrita la palabra?</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {SC.map((c, i) => (
          <button key={c.name} onClick={() => answer(i)} className="flex h-14 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] text-sm font-semibold active:scale-95">
            <span className="h-4 w-4 rounded-full" style={{ background: c.color }} />
            {c.name.charAt(0) + c.name.slice(1).toLowerCase()}
            <span className="font-mono text-[10px] text-ink-500">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const stroop: GameDef = {
  id: 'stroop',
  name: 'Efecto Stroop',
  domain: 'atencion',
  tagline: 'Nombra el color de la tinta, no la palabra.',
  instructions: ['Aparecerá el nombre de un color escrito en otro color.', 'Elige el color de la TINTA, ignorando lo que dice la palabra.', 'Responde todas las que puedas en el tiempo disponible.'],
  why: 'Leer es automático, así que la palabra interfiere con el color. Resolver ese conflicto activa el control ejecutivo (corteza cingulada anterior y prefrontal). Con práctica, el efecto de interferencia se reduce.',
  keys: '1–4',
  maxLevel: 10,
  scoreUnit: 'correctas',
  higherBetter: true,
  normalize: (r) => clamp(scale(r.score, 10, 45) * r.accuracy, 0, 100),
  Component: Stroop,
};
