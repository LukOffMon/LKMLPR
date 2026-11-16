import type { Card } from './types';

const DAY = 86_400_000;

/** Calificaciones: 0 = Otra vez, 1 = Difícil, 2 = Bien, 3 = Fácil. */
export type Grade = 0 | 1 | 2 | 3;

/**
 * Algoritmo SM-2 con pasos de aprendizaje cortos (estilo Anki):
 * el intervalo crece multiplicando por el factor de facilidad; los fallos lo reinician.
 */
export function schedule(card: Card, grade: Grade, now = Date.now()): Card {
  const c = { ...card, lastReview: now };
  if (grade === 0) {
    c.lapses += card.reps > 0 ? 1 : 0;
    c.reps = 0;
    c.interval = 0;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.due = now + 60_000; // 1 minuto
    return c;
  }
  const q = [0, 3, 4, 5][grade];
  c.ease = Math.max(1.3, c.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  if (c.reps === 0) c.interval = grade === 1 ? 0.007 : grade === 2 ? 1 : 3; // 10 min, 1 día, 3 días
  else if (c.reps === 1) c.interval = grade === 1 ? 1 : grade === 2 ? 3 : 6;
  else c.interval = Math.max(1, c.interval * (grade === 1 ? 1.2 : grade === 2 ? c.ease : c.ease * 1.3));
  c.reps += 1;
  c.due = now + c.interval * DAY;
  return c;
}

export function previewInterval(card: Card, grade: Grade): string {
  const n = schedule(card, grade, 0);
  const ms = n.due;
  if (ms < 3_600_000) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (ms < DAY) return `${Math.round(ms / 3_600_000)} h`;
  const d = ms / DAY;
  if (d < 30) return `${Math.round(d)} d`;
  if (d < 365) return `${(d / 30).toFixed(1)} m`;
  return `${(d / 365).toFixed(1)} a`;
}

export const isDue = (c: Card, now = Date.now()) => c.due <= now;

export function dueCards(cards: Card[], deckId?: string, now = Date.now()) {
  return cards.filter((c) => (!deckId || c.deckId === deckId) && isDue(c, now)).sort((a, b) => a.due - b.due);
}

/** Estimación de retención actual de una tarjeta (modelo exponencial). */
export function retrievability(c: Card, now = Date.now()) {
  if (!c.lastReview || c.interval <= 0) return c.reps ? 0.9 : 0;
  const elapsed = (now - c.lastReview) / DAY;
  return Math.exp((Math.log(0.9) * elapsed) / c.interval);
}

export function newCard(deckId: string, front: string, back: string): Card {
  const now = Date.now();
  return { id: Math.random().toString(36).slice(2) + now.toString(36), deckId, front, back, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, created: now };
}
