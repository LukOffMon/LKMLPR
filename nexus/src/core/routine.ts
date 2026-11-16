import type { AppState, Domain } from './types';
import { GAME, GAMES, DOMAIN_OF } from '../games';
import { domainProfile } from './progress';
import { dueCards } from './srs';
import { dayKey, shuffle } from './rng';
import { DOMAINS } from './domains';

const NOT_IN_ROUTINE = new Set(['srs', 'lateral', 'calibration', 'pairs']);

/**
 * Genera la rutina del día: prioriza los dominios más débiles, garantiza memoria,
 * intercala dominios (sin dos seguidos iguales) y ajusta la duración configurada.
 */
export function buildRoutine(s: AppState): string[] {
  const budget = s.settings.sessionMinutes;
  const prof = domainProfile(s, DOMAIN_OF);
  const lastPlayed: Record<string, number> = {};
  for (const ses of s.sessions) lastPlayed[ses.gameId] = ses.ts;
  // peso: dominios sin datos o bajos primero
  const ranked = DOMAINS.map((d) => ({ d: d.id, v: prof[d.id] ?? 30 + Math.random() * 10 })).sort((a, b) => a.v - b.v);
  const items: string[] = [];
  let minutes = 0;
  const due = dueCards(s.cards).length;
  if (due > 0) {
    items.push('srs');
    minutes += Math.min(6, 1 + due * 0.25);
  }
  const pickFrom = (dom: Domain) => {
    const cands = GAMES.filter((g) => g.domain === dom && !NOT_IN_ROUTINE.has(g.id) && !items.includes(g.id));
    if (!cands.length) return null;
    // el menos practicado recientemente, con algo de azar
    return shuffle(cands).sort((a, b) => (lastPlayed[a.id] ?? 0) - (lastPlayed[b.id] ?? 0))[0];
  };
  const order: Domain[] = [];
  // los 3 más débiles dos veces, memoria siempre, después el resto
  ranked.slice(0, 3).forEach((r) => order.push(r.d));
  if (!order.includes('memoria')) order.push('memoria');
  ranked.slice(0, 3).forEach((r) => order.push(r.d));
  ranked.slice(3).forEach((r) => order.push(r.d));
  for (const dom of order) {
    const g = pickFrom(dom);
    if (!g) continue;
    const m = g.minutes ?? 3;
    if (minutes + m > budget + 1) continue;
    items.push(g.id);
    minutes += m;
    if (minutes >= budget - 1) break;
  }
  // intercalado: evita dos del mismo dominio seguidos
  const head = items[0] === 'srs' ? ['srs'] : [];
  const rest = items.filter((x) => x !== 'srs');
  const out: string[] = [];
  while (rest.length) {
    const prev = out.length ? GAME[out[out.length - 1]].domain : null;
    const k = rest.findIndex((x) => GAME[x].domain !== prev);
    out.push(rest.splice(k < 0 ? 0 : k, 1)[0]);
  }
  return [...head, ...out];
}

export function todayRoutine(s: AppState) {
  return s.routine && s.routine.day === dayKey() ? s.routine : null;
}

export function routineMinutes(ids: string[]) {
  return ids.reduce((a, id) => a + (GAME[id]?.minutes ?? 3), 0);
}
