import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Layers, Play } from 'lucide-react';
import type { GameDef, GameProps, Card } from '../core/types';
import { update, useStore, getState } from '../core/store';
import { dueCards, newCard, previewInterval, retrievability, schedule, type Grade } from '../core/srs';
import { feedback } from '../core/bus';
import { C, useFinish } from './kit';
import { Bars } from '../components/charts';
import { Button, GameHud, Glass, Kbd, Modal, Pill, Stat, cx, inputCls, useKey } from '../components/ui';
import { mean, shuffle, uid } from '../core/rng';

const GRADES: { g: Grade; label: string; color: string; key: string }[] = [
  { g: 0, label: 'Otra vez', color: '#fb7185', key: '1' },
  { g: 1, label: 'Difícil', color: '#fbbf24', key: '2' },
  { g: 2, label: 'Bien', color: '#34d399', key: '3' },
  { g: 3, label: 'Fácil', color: '#22d3ee', key: '4' },
];

function Review({ queue, onDone }: { queue: Card[]; onDone: (n: number, good: number) => void }) {
  const [q, setQ] = useState(queue);
  const [flip, setFlip] = useState(false);
  const done = useRef({ n: 0, good: 0 });
  const card = q[0];
  const grade = (g: Grade) => {
    if (!card || !flip) return;
    const next = schedule(card, g);
    update((d) => {
      const i = d.cards.findIndex((c) => c.id === card.id);
      if (i >= 0) d.cards[i] = next;
      d.reviews.push({ ts: Date.now(), cardId: card.id, grade: g });
    });
    feedback(g > 0);
    done.current.n++;
    if (g > 0) done.current.good++;
    const rest = q.slice(1);
    if (g === 0) rest.push(next); // vuelve a la cola de la sesión
    setFlip(false);
    if (!rest.length) onDone(done.current.n, done.current.good);
    setQ(rest);
  };
  useKey((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!flip) setFlip(true);
    }
    const G = GRADES.find((x) => x.key === e.key);
    if (G) grade(G.g);
  }, [flip, card]);
  if (!card) return null;
  return (
    <div className="mx-auto max-w-xl">
      <GameHud>
        <span>Quedan {q.length}</span>
        <span className="hidden sm:inline">
          <Kbd>Espacio</Kbd> mostrar · <Kbd>1–4</Kbd> calificar
        </span>
      </GameHud>
      <AnimatePresence mode="wait">
        <motion.div key={card.id + q.length} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="min-h-[220px] rounded-2xl border border-white/[.08] bg-ink-900/70 p-6 text-center">
          <div className="text-[11px] uppercase tracking-[.18em] text-ink-400">Pregunta</div>
          <div className="mt-2 font-display text-2xl font-semibold text-ink-100">{card.front}</div>
          {flip && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 border-t border-white/10 pt-5">
              <div className="text-[11px] uppercase tracking-[.18em] text-ink-400">Respuesta</div>
              <div className="mt-2 text-xl text-mem">{card.back}</div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="mt-4">
        {!flip ? (
          <Button className="w-full" size="lg" variant="primary" accent={C.mem} onClick={() => setFlip(true)}>
            Mostrar respuesta
          </Button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((G) => (
              <button key={G.g} onClick={() => grade(G.g)} className="rounded-xl border py-2.5 text-sm font-semibold transition hover:brightness-125" style={{ borderColor: `${G.color}55`, background: `${G.color}18`, color: G.color }}>
                {G.label}
                <div className="text-[11px] font-normal text-ink-400">{previewInterval(card, G.g)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">Intenta recordar la respuesta antes de mostrarla: el esfuerzo de recuperación es lo que fortalece el recuerdo.</p>
    </div>
  );
}

function SrsModule({ onFinish, short }: GameProps) {
  const finish = useFinish(onFinish);
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const reviews = useStore((s) => s.reviews);
  const [deck, setDeck] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<Card[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [deckName, setDeckName] = useState('');
  const now = Date.now();
  const stats = useMemo(() => {
    const recent = reviews.filter((r) => r.ts > now - 30 * 86_400_000);
    const retention = recent.length ? recent.filter((r) => r.grade > 0).length / recent.length : null;
    const forecast = [...Array(7)].map((_, i) => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const lo = i === 0 ? 0 : end.getTime() + (i - 1) * 86_400_000;
      const hi = end.getTime() + i * 86_400_000;
      return { label: i === 0 ? 'Hoy' : `+${i}`, value: cards.filter((c) => c.due > lo && c.due <= hi).length };
    });
    const mature = cards.filter((c) => c.interval >= 21).length;
    const avgR = mean(cards.filter((c) => c.reps > 0).map((c) => retrievability(c, now)));
    return { retention, forecast, mature, avgR };
  }, [cards, reviews, now]);

  if (reviewing)
    return (
      <Review
        queue={reviewing}
        onDone={(n, good) => {
          setReviewing(null);
          finish({ score: n, accuracy: n ? good / n : 0, metrics: { repasos: n }, summary: `${n} repasos · ${Math.round((good / Math.max(1, n)) * 100)} % recordadas` });
        }}
      />
    );

  const start = (deckId?: string, extra = false) => {
    let q = dueCards(cards, deckId);
    if (extra || !q.length) q = shuffle(cards.filter((c) => !deckId || c.deckId === deckId)).slice(0, 10);
    if (short) q = q.slice(0, 8);
    if (q.length) setReviewing(q);
  };
  const totalDue = dueCards(cards).length;
  const shown = deck ? cards.filter((c) => c.deckId === deck) : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Glass className="p-4"><Stat label="Pendientes hoy" value={totalDue} color={C.mem} /></Glass>
        <Glass className="p-4"><Stat label="Retención 30 d" value={stats.retention === null ? '—' : `${Math.round(stats.retention * 100)} %`} /></Glass>
        <Glass className="p-4"><Stat label="Tarjetas maduras" value={stats.mature} sub="intervalo ≥ 21 días" /></Glass>
        <Glass className="p-4"><Stat label="Recuerdo estimado" value={stats.avgR ? `${Math.round(stats.avgR * 100)} %` : '—'} sub="probabilidad media hoy" /></Glass>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" accent={C.mem} icon={<Play size={16} />} onClick={() => start()} disabled={!cards.length}>
          {totalDue ? `Repasar ${totalDue} pendientes` : 'Repaso extra (10)'}
        </Button>
        <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>Nueva tarjeta</Button>
        <Button icon={<Layers size={16} />} onClick={() => setDeckOpen(true)}>Nuevo mazo</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => {
          const dc = cards.filter((c) => c.deckId === d.id);
          const due = dueCards(dc).length;
          return (
            <Glass key={d.id} className={cx('p-4', deck === d.id && 'ring-1 ring-white/25')} onClick={() => setDeck(deck === d.id ? null : d.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display font-semibold text-ink-100">{d.name}</div>
                  <div className="text-xs text-ink-400">{dc.length} tarjetas</div>
                </div>
                {due > 0 && <Pill color={d.color}>{due} hoy</Pill>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={(e) => (e.stopPropagation(), start(d.id))} disabled={!dc.length}>
                  {due ? 'Repasar' : 'Practicar'}
                </Button>
                {!d.system && (
                  <Button size="sm" variant="ghost" onClick={(e) => (e.stopPropagation(), update((s) => { s.decks = s.decks.filter((x) => x.id !== d.id); s.cards = s.cards.filter((c) => c.deckId !== d.id); }))} aria-label={`Eliminar mazo ${d.name}`}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </Glass>
          );
        })}
      </div>
      {deck && (
        <Glass className="p-4">
          <div className="mb-2 text-sm font-semibold text-ink-200">Tarjetas del mazo</div>
          <div className="max-h-72 space-y-1 overflow-auto pr-1">
            {shown.length === 0 && <div className="text-sm text-ink-400">Este mazo está vacío. Añade tu primera tarjeta.</div>}
            {shown.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[.04]">
                <span className="min-w-0 flex-1 truncate text-ink-100">{c.front}</span>
                <span className="min-w-0 flex-1 truncate text-ink-400">{c.back}</span>
                <span className="w-16 text-right font-mono text-xs text-ink-500">{c.reps ? `${Math.round(c.interval)} d` : 'nueva'}</span>
                <button onClick={() => update((s) => void (s.cards = s.cards.filter((x) => x.id !== c.id)))} className="text-ink-500 hover:text-rose-300" aria-label="Eliminar tarjeta">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Glass>
      )}
      <Glass className="p-4">
        <div className="mb-3 text-sm font-semibold text-ink-200">Previsión de repasos (7 días)</div>
        <Bars data={stats.forecast} color={C.mem} height={90} />
      </Glass>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nueva tarjeta">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const d = deck ?? getState().decks[0]?.id;
            if (!front.trim() || !back.trim() || !d) return;
            update((s) => void s.cards.push(newCard(d, front.trim(), back.trim())));
            setFront('');
            setBack('');
          }}
        >
          <select id="srs-deck" className={inputCls} value={deck ?? decks[0]?.id} onChange={(e) => setDeck(e.target.value)}>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <textarea id="srs-front" className={cx(inputCls, 'h-20 py-2')} placeholder="Anverso (pregunta)" value={front} onChange={(e) => setFront(e.target.value)} />
          <textarea id="srs-back" className={cx(inputCls, 'h-20 py-2')} placeholder="Reverso (respuesta)" value={back} onChange={(e) => setBack(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cerrar</Button>
            <Button type="submit" variant="primary" accent={C.mem}>Añadir</Button>
          </div>
          <p className="text-xs text-ink-400">Consejo: una idea por tarjeta, formulada como pregunta concreta.</p>
        </form>
      </Modal>
      <Modal open={deckOpen} onClose={() => setDeckOpen(false)} title="Nuevo mazo">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!deckName.trim()) return;
            const id = uid();
            update((s) => void s.decks.push({ id, name: deckName.trim(), color: ['#a78bfa', '#22d3ee', '#fbbf24', '#34d399', '#f472b6'][s.decks.length % 5], created: Date.now() }));
            setDeck(id);
            setDeckName('');
            setDeckOpen(false);
          }}
        >
          <input id="srs-deckname" autoFocus className={inputCls} placeholder="Nombre del mazo" value={deckName} onChange={(e) => setDeckName(e.target.value)} />
          <Button type="submit" variant="primary" accent={C.mem}>Crear</Button>
        </form>
      </Modal>
    </div>
  );
}

export const srs: GameDef = {
  id: 'srs',
  name: 'Repetición espaciada',
  domain: 'memoria',
  tagline: 'Tus mazos con algoritmo SM-2 y cola diaria.',
  instructions: ['Crea mazos y tarjetas con lo que quieras aprender.', 'Cada día repasa las tarjetas pendientes: intenta recordar, muestra la respuesta y califica tu recuerdo.', '«Otra vez» la repite hoy; «Bien» y «Fácil» alargan el intervalo.'],
  why: 'El efecto de espaciado es uno de los hallazgos más sólidos de la psicología: repasar justo cuando empiezas a olvidar fortalece la huella de memoria con el mínimo tiempo. El algoritmo SM-2 ajusta el intervalo de cada tarjeta según lo fácil que te resulta.',
  maxLevel: 1,
  scoreUnit: 'repasos',
  higherBetter: true,
  normalize: (r) => r.accuracy * 100,
  Component: SrsModule,
  tool: true,
};
