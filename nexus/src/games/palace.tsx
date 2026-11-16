import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as I from 'lucide-react';
import type { GameDef, GameProps, Palace } from '../core/types';
import { getState, update, useStore } from '../core/store';
import { feedback } from '../core/bus';
import { clamp, norm, sample, uid } from '../core/rng';
import { CONCRETE } from '../data/words';
import { C, useFinish } from './kit';
import { Button, GameHud, Glass, Pill, cx, inputCls } from '../components/ui';

export const LOCUS_ICONS: Record<string, I.LucideIcon> = {
  door: I.DoorOpen, mat: I.RectangleHorizontal, coat: I.Shirt, sofa: I.Sofa, tv: I.Tv, table: I.Utensils, fridge: I.Refrigerator, sink: I.Droplets,
  stairs: I.ChevronsUp, bath: I.Bath, bed: I.BedDouble, window: I.AppWindow, lamp: I.Lamp, book: I.BookOpen, car: I.Car, tree: I.TreePine,
  armchair: I.Armchair, flower: I.Flower2, clock: I.Clock, bike: I.Bike, monitor: I.Monitor, coffee: I.Coffee, plant: I.Sprout, music: I.Music,
};

function PalaceMap({ palace, active, onMapClick, done, size = 'md' }: { palace: Palace; active?: number; onMapClick?: (x: number, y: number) => void; done?: Set<number>; size?: 'sm' | 'md' }) {
  const pts = palace.loci.map((l) => `${l.x},${l.y}`).join(' ');
  return (
    <div className={cx('relative mx-auto w-full overflow-hidden rounded-2xl border border-white/[.08]', size === 'sm' ? 'max-w-[360px]' : 'max-w-[560px]')} style={{ aspectRatio: '1 / 0.8', background: 'radial-gradient(circle at 30% 20%, rgba(167,139,250,.12), transparent 60%), #0a0e1a' }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={cx('absolute inset-0 h-full w-full', onMapClick && 'cursor-crosshair')}
        onClick={(e) => {
          if (!onMapClick) return;
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          onMapClick(clamp(((e.clientX - r.left) / r.width) * 100, 5, 95), clamp(((e.clientY - r.top) / r.height) * 100, 6, 94));
        }}
      >
        {/* plano: paredes de habitaciones */}
        <g stroke="rgba(167,139,250,.14)" strokeWidth=".5" fill="none">
          <rect x="2" y="2" width="96" height="96" />
          <path d="M2 34 H46 M46 2 V60 M46 60 H98 M66 60 V98 M2 70 H46 M30 70 V98" />
        </g>
        <polyline points={pts} fill="none" stroke="rgba(167,139,250,.35)" strokeWidth=".5" strokeDasharray="1.5 1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {palace.loci.map((l, i) => {
        const Icon = LOCUS_ICONS[l.icon] ?? I.MapPin;
        const on = active === i;
        const ok = done?.has(i);
        return (
          <motion.div key={l.id} className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${l.x}%`, top: `${l.y}%` }} animate={{ scale: on ? 1.25 : 1 }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border" style={{ background: on ? C.mem : ok ? 'rgba(52,211,153,.25)' : 'rgba(15,20,36,.9)', borderColor: on ? '#ede9fe' : 'rgba(167,139,250,.4)', boxShadow: on ? `0 0 24px ${C.mem}` : undefined }}>
              <Icon size={16} color={on ? '#05070d' : '#ddd6fe'} />
            </div>
            <div className="mt-0.5 whitespace-nowrap rounded bg-black/50 px-1 text-[9px] font-medium text-ink-200">
              {i + 1}. {l.name}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ───────── Tutorial guiado ─────────
const TUT = [
  { t: 'Elige un lugar que conozcas de memoria', d: 'Tu casa, el camino al trabajo, tu escuela. El cerebro tiene un sistema de memoria espacial muy potente (el hipocampo evolucionó para orientarnos). Aquí usaremos «Mi casa».' },
  { t: 'Define una ruta fija con estaciones (loci)', d: 'Recorre siempre el mismo orden: puerta, felpudo, perchero… Cada estación será un «gancho» donde colgar una imagen. La línea discontinua del plano es tu ruta.' },
  { t: 'Convierte cada dato en una imagen exagerada', d: 'Las imágenes absurdas, en movimiento, con sonidos y emociones se recuerdan mucho mejor que las neutras. «Paraguas» → un paraguas gigante abriéndose y cerrándose y golpeando la puerta.' },
  { t: 'Coloca la imagen interactuando con el locus', d: 'No basta con poner el objeto «al lado»: haz que interactúe con el lugar (el elefante aplasta el sofá). Tómate 5–10 segundos para verlo con detalle.' },
  { t: 'Recorre la ruta para recordar', d: 'Para recuperar la lista, camina mentalmente por la ruta y «mira» qué hay en cada estación. Vamos a probarlo con 5 objetos.' },
];

function Tutorial({ onDone }: { onDone: () => void }) {
  const palace = useStore((s) => s.palaces[0]);
  const [step, setStep] = useState(0);
  const items = useMemo(() => sample(CONCRETE, 5), []);
  const [phase, setPhase] = useState<'learn' | 'demo' | 'recall' | 'end'>('learn');
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [hits, setHits] = useState(0);
  if (phase === 'learn') {
    const s = TUT[step];
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <PalaceMap palace={palace} active={step === 1 ? 0 : step >= 2 ? 3 : undefined} size="sm" />
        <div>
          <Pill color={C.mem}>Paso {step + 1} de 5</Pill>
          <h3 className="mt-2 font-display text-xl font-semibold">{s.t}</h3>
          <p className="mt-2 leading-relaxed text-ink-300">{s.d}</p>
          <div className="mt-5 flex gap-2">
            {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Atrás</Button>}
            <Button variant="primary" accent={C.mem} onClick={() => (step < 4 ? setStep(step + 1) : setPhase('demo'))}>
              {step < 4 ? 'Siguiente' : 'Probar con 5 objetos'}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (phase === 'demo')
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <PalaceMap palace={palace} active={i} size="sm" />
        <div className="flex flex-col justify-center">
          <div className="text-sm text-ink-400">Estación {i + 1}: {palace.loci[i].name}</div>
          <div className="my-2 font-display text-4xl font-bold" style={{ color: C.mem }}>{items[i]}</div>
          <p className="text-sm text-ink-300">Imagina {items[i]} interactuando de forma absurda con «{palace.loci[i].name.toLowerCase()}».</p>
          <div className="mt-4">
            <Button variant="primary" accent={C.mem} onClick={() => (i < 4 ? setI(i + 1) : (setI(0), setPhase('recall')))}>
              {i < 4 ? 'Siguiente estación' : 'Ahora recuerda'}
            </Button>
          </div>
        </div>
      </div>
    );
  if (phase === 'recall')
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <PalaceMap palace={palace} active={i} size="sm" />
        <form
          className="flex flex-col justify-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const ok = norm(val) === norm(items[i]);
            feedback(ok);
            if (ok) setHits((h) => h + 1);
            setVal('');
            if (i < 4) setI(i + 1);
            else setPhase('end');
          }}
        >
          <div className="text-sm text-ink-400">¿Qué había en «{palace.loci[i].name}»?</div>
          <input id="tut-recall" autoFocus className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Escribe el objeto" />
          <Button type="submit" variant="primary" accent={C.mem}>Comprobar</Button>
        </form>
      </div>
    );
  return (
    <div className="py-8 text-center">
      <div className="font-display text-5xl font-bold" style={{ color: C.mem }}>{hits}/5</div>
      <p className="mx-auto mt-3 max-w-md text-ink-300">Acabas de usar el método de loci. Con práctica, los campeones de memoria recuerdan cientos de elementos así. Ya puedes crear tus propios palacios y hacer recorridos puntuados.</p>
      <Button className="mt-5" variant="primary" accent={C.mem} onClick={onDone}>Terminar tutorial</Button>
    </div>
  );
}

// ───────── Editor de palacios ─────────
function Editor({ palace, onClose }: { palace: Palace; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('lamp');
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const idx = getState().palaces.findIndex((p) => p.id === palace.id);
  const mod = (fn: (p: Palace) => void) => update((d) => fn(d.palaces[idx]));
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="mb-2 text-sm text-ink-400">Toca el plano para colocar una nueva estación.</p>
        <PalaceMap palace={palace} onMapClick={(x, y) => setPending({ x, y })} />
        {pending && (
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              mod((p) => void p.loci.push({ id: uid(), name: name.trim(), icon, ...pending }));
              setName('');
              setPending(null);
            }}
          >
            <input id="locus-name" autoFocus className={cx(inputCls, 'min-w-[160px] flex-1')} placeholder="Nombre del lugar (ej. Estantería)" value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" variant="primary" accent={C.mem}>Añadir</Button>
            <div className="flex w-full flex-wrap gap-1">
              {Object.entries(LOCUS_ICONS).map(([k, Ic]) => (
                <button type="button" key={k} onClick={() => setIcon(k)} className={cx('rounded-lg p-1.5', icon === k ? 'bg-mem/30 ring-1 ring-mem' : 'bg-white/5 hover:bg-white/10')} aria-label={k}>
                  <Ic size={16} />
                </button>
              ))}
            </div>
          </form>
        )}
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-ink-400" htmlFor="palace-name">Nombre</label>
        <input id="palace-name" className={cx(inputCls, 'mb-3 mt-1')} value={palace.name} onChange={(e) => mod((p) => void (p.name = e.target.value))} />
        <div className="max-h-[50vh] space-y-1 overflow-auto pr-1">
          {palace.loci.map((l, i) => (
            <div key={l.id} className="flex items-center gap-2 rounded-lg bg-white/[.03] px-2 py-1.5 text-sm">
              <span className="w-5 font-mono text-xs text-mem">{i + 1}</span>
              <input id={`locus-${l.id}`} className="min-w-0 flex-1 bg-transparent outline-none" value={l.name} onChange={(e) => mod((p) => void (p.loci[i].name = e.target.value))} />
              <button disabled={i === 0} onClick={() => mod((p) => void ([p.loci[i - 1], p.loci[i]] = [p.loci[i], p.loci[i - 1]]))} className="text-ink-400 hover:text-ink-100 disabled:opacity-20" aria-label="Subir">
                <I.ArrowUp size={14} />
              </button>
              <button onClick={() => mod((p) => void p.loci.splice(i, 1))} className="text-ink-500 hover:text-rose-300" aria-label="Eliminar">
                <I.Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="primary" accent={C.mem} onClick={onClose}>Listo</Button>
          {getState().palaces.length > 1 && (
            <Button variant="danger" onClick={() => (update((d) => void d.palaces.splice(idx, 1)), onClose())}>Eliminar palacio</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────── Recorrido puntuado ─────────
function Walk({ palace, level, short, onFinish, custom }: GameProps & { palace: Palace; custom: string[] | null }) {
  const finish = useFinish(onFinish);
  const n = Math.min(palace.loci.length, custom ? custom.length : short ? 5 : clamp(level + 4, 5, 30));
  const items = useMemo(() => (custom ? custom.slice(0, n) : sample(CONCRETE, n)), [n, custom]);
  const [phase, setPhase] = useState<'study' | 'recall' | 'review'>('study');
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const answers = useRef<string[]>([]);
  const t0 = useRef(performance.now());
  const done = useMemo(() => new Set(answers.current.map((a, k) => (norm(a) === norm(items[k]) ? k : -1))), [i, phase, items]);

  if (phase === 'study')
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <PalaceMap palace={palace} active={i} />
        <div className="flex flex-col justify-center">
          <GameHud>
            <span>Estudio {i + 1}/{n}</span>
          </GameHud>
          <div className="text-sm text-ink-400">Estación: {palace.loci[i].name}</div>
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="my-3 font-display text-4xl font-bold" style={{ color: C.mem }}>
            {items[i]}
          </motion.div>
          <p className="text-sm text-ink-400">Crea una imagen vívida y absurda que lo conecte con este lugar.</p>
          <div className="mt-4 flex gap-2">
            {i > 0 && <Button variant="ghost" onClick={() => setI(i - 1)}>Anterior</Button>}
            <Button variant="primary" accent={C.mem} onClick={() => (i + 1 < n ? setI(i + 1) : (setI(0), setPhase('recall'), (t0.current = performance.now())))}>
              {i + 1 < n ? 'Siguiente' : 'Iniciar recuerdo'}
            </Button>
          </div>
        </div>
      </div>
    );
  if (phase === 'recall')
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <PalaceMap palace={palace} active={i} done={done} />
        <form
          className="flex flex-col justify-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            answers.current[i] = val;
            feedback(norm(val) === norm(items[i]));
            setVal('');
            if (i + 1 < n) setI(i + 1);
            else setPhase('review');
          }}
        >
          <GameHud>
            <span>Recuerdo {i + 1}/{n}</span>
          </GameHud>
          <div className="text-ink-300">¿Qué colocaste en <b className="text-ink-100">{palace.loci[i].name}</b>?</div>
          <input id="walk-recall" autoFocus autoComplete="off" className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Escribe (o deja vacío si no lo recuerdas)" />
          <Button type="submit" variant="primary" accent={C.mem}>Siguiente estación</Button>
        </form>
      </div>
    );
  const hits = items.filter((it, k) => norm(answers.current[k] ?? '') === norm(it)).length;
  return (
    <div>
      <div className="mb-4 text-center font-display text-3xl font-bold" style={{ color: C.mem }}>{hits}/{n} recordados</div>
      <div className="mx-auto grid max-w-xl gap-1.5">
        {items.map((it, k) => {
          const ok = norm(answers.current[k] ?? '') === norm(it);
          return (
            <div key={k} className={cx('flex items-center justify-between rounded-lg px-3 py-2 text-sm', ok ? 'bg-emerald-400/10' : 'bg-rose-400/10')}>
              <span className="text-ink-400">{k + 1}. {palace.loci[k].name}</span>
              <span className={ok ? 'text-emerald-200' : 'text-rose-200'}>{ok ? it : `${answers.current[k] || '—'} → ${it}`}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 text-center">
        <Button
          variant="primary"
          accent={C.mem}
          onClick={() => {
            update((d) => {
              const p = d.palaces.find((x) => x.id === palace.id);
              if (p) p.items = items;
            });
            finish({ score: hits, accuracy: hits / n, metrics: { elementos: n, segundos: Math.round((performance.now() - t0.current) / 1000) }, summary: `${hits} de ${n} elementos recuperados del palacio «${palace.name}»` });
          }}
        >
          Ver resultados
        </Button>
      </div>
    </div>
  );
}

function PalaceModule(props: GameProps) {
  const palaces = useStore((s) => s.palaces);
  const tutDone = useStore((s) => !!s.flags.palaceTutorial);
  const [view, setView] = useState<'home' | 'tutorial' | 'edit' | 'walk'>(tutDone || props.short ? 'home' : 'tutorial');
  const [sel, setSel] = useState(palaces[0]?.id);
  const [customText, setCustomText] = useState('');
  const [custom, setCustom] = useState<string[] | null>(null);
  const palace = palaces.find((p) => p.id === sel) ?? palaces[0];

  if (view === 'tutorial') return <Tutorial onDone={() => (update((d) => void (d.flags.palaceTutorial = true)), setView('home'))} />;
  if (view === 'edit' && palace) return <Editor palace={palace} onClose={() => setView('home')} />;
  if (view === 'walk' && palace) return <Walk {...props} palace={palace} custom={custom} />;
  const maxN = Math.min(palace?.loci.length ?? 0, clamp(props.level + 4, 5, 30));
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div>{palace && <PalaceMap palace={palace} />}</div>
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-ink-400">Tus palacios</div>
          <div className="space-y-1.5">
            {palaces.map((p) => (
              <button key={p.id} onClick={() => setSel(p.id)} className={cx('flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm', p.id === palace?.id ? 'border-mem/60 bg-mem/10' : 'border-white/[.07] bg-white/[.03] hover:bg-white/[.06]')}>
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-ink-400">{p.loci.length} loci</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" icon={<I.Plus size={14} />} onClick={() => {
              const id = uid();
              update((d) => void d.palaces.push({ id, name: `Palacio ${d.palaces.length + 1}`, loci: [], created: Date.now() }));
              setSel(id);
              setView('edit');
            }}>Nuevo</Button>
            <Button size="sm" icon={<I.Pencil size={14} />} onClick={() => setView('edit')}>Editar</Button>
            <Button size="sm" variant="ghost" icon={<I.GraduationCap size={14} />} onClick={() => setView('tutorial')}>Tutorial</Button>
          </div>
        </div>
        <Glass className="p-4">
          <div className="font-display font-semibold">Recorrido puntuado</div>
          <p className="mt-1 text-sm text-ink-400">Memoriza {maxN} objetos al azar (según tu nivel) o tu propia lista.</p>
          <textarea id="palace-custom" className={cx(inputCls, 'mt-3 h-20 py-2 text-sm')} placeholder="Opcional: tu lista, un elemento por línea (conceptos, tareas, ideas…)" value={customText} onChange={(e) => setCustomText(e.target.value)} />
          <Button
            className="mt-3 w-full"
            variant="primary"
            accent={C.mem}
            disabled={!palace || palace.loci.length < 3}
            onClick={() => {
              const lines = customText.split('\n').map((x) => x.trim()).filter(Boolean);
              setCustom(lines.length >= 3 ? lines : null);
              setView('walk');
            }}
          >
            Comenzar recorrido
          </Button>
          {palace && palace.loci.length < 3 && <p className="mt-2 text-xs text-amber-300">Añade al menos 3 estaciones a este palacio.</p>}
          {palace?.items && <p className="mt-2 text-xs text-ink-500">Último recorrido: {palace.items.slice(0, 4).join(', ')}{palace.items.length > 4 ? '…' : ''}</p>}
        </Glass>
        <p className="text-xs text-ink-500">Consejo: usa palacios distintos para listas distintas o deja pasar un día antes de reutilizar uno, para evitar interferencias.</p>
      </div>
    </div>
  );
}

export const palace: GameDef = {
  id: 'palace',
  name: 'Palacio de la Memoria',
  domain: 'memoria',
  tagline: 'El método de loci: memoriza listas recorriendo lugares.',
  instructions: ['La primera vez seguirás un tutorial guiado del método de loci.', 'Crea palacios: lugares que conoces con estaciones en un orden fijo.', 'En el recorrido, asocia cada elemento a una estación con una imagen vívida.', 'Después recorre el palacio y escribe lo que había en cada estación.'],
  why: 'El método de loci, usado desde la antigua Grecia, aprovecha la memoria espacial. Estudios con campeones de memoria muestran que no tienen cerebros excepcionales: usan esta técnica, y personas sin entrenamiento mejoran notablemente su recuerdo de listas tras unas semanas de práctica.',
  maxLevel: 26,
  scoreUnit: 'elementos',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 50 + (level + 4) * 2.5, 0, 100),
  Component: PalaceModule,
  tool: true,
};
