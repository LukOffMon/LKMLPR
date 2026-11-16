import type { AppState, Domain, GameDef, RawResult, Session } from './types';
import { getState, update } from './store';
import { clamp, dayKey, uid } from './rng';
import { DOMAINS } from './domains';
import { ACHIEVEMENTS } from './achievements';

// ───────── XP, niveles y rangos ─────────
export const xpForLevel = (lvl: number) => Math.round(120 * Math.pow(lvl - 1, 1.55));

export function levelFromXp(xp: number) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  const cur = xpForLevel(l);
  const next = xpForLevel(l + 1);
  return { level: l, into: xp - cur, span: next - cur, progress: (xp - cur) / (next - cur) };
}

export const RANKS = [
  { name: 'Iniciado', min: 1 },
  { name: 'Adepto', min: 5 },
  { name: 'Maestro', min: 12 },
  { name: 'Mnemonista', min: 22 },
  { name: 'Arquitecto Mental', min: 35 },
];

export function rankFor(level: number) {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.min) r = x;
  const idx = RANKS.indexOf(r);
  return { ...r, index: idx, next: RANKS[idx + 1] ?? null };
}

// ───────── Dificultad adaptativa (staircase) ─────────
/** Objetivo: mantener la precisión en la zona de esfuerzo deseable (75–85 %). */
export function nextLevel(level: number, accuracy: number, max: number) {
  let l = level;
  if (accuracy >= 0.9) l += 2;
  else if (accuracy >= 0.85) l += 1;
  else if (accuracy < 0.6) l -= 2;
  else if (accuracy < 0.72) l -= 1;
  return clamp(l, 1, max);
}

export const getLevel = (s: AppState, id: string) => s.levels[id] ?? 1;

// ───────── Registro de sesiones ─────────
export interface SessionOutcome {
  session: Session;
  xp: number;
  prevBest: number | null;
  avg: number | null;
  isRecord: boolean;
  newLevel: number;
  levelChange: number;
  playerLevelUp: boolean;
  newAchievements: string[];
}

export function recordSession(def: GameDef, level: number, r: RawResult, durationMs: number, predicted?: number): SessionOutcome {
  const s = getState();
  const prev = s.sessions.filter((x) => x.gameId === def.id);
  const prevBest = prev.length ? (def.higherBetter ? Math.max(...prev.map((p) => p.score)) : Math.min(...prev.map((p) => p.score))) : null;
  const avg = prev.length ? prev.slice(-10).reduce((a, b) => a + b.score, 0) / Math.min(10, prev.length) : null;
  const isRecord = prevBest !== null && (def.higherBetter ? r.score > prevBest : r.score < prevBest);
  const normalized = Math.round(clamp(def.normalize(r, level), 0, 100));
  const session: Session = {
    id: uid(),
    gameId: def.id,
    domain: def.domain,
    ts: Date.now(),
    score: r.score,
    accuracy: clamp(r.accuracy, 0, 1),
    level,
    normalized,
    durationMs,
    metrics: r.metrics,
    predicted,
  };
  const newLevel = clamp(r.nextLevel ?? nextLevel(level, r.accuracy, def.maxLevel), 1, def.maxLevel);
  const xp = Math.round(15 + 35 * clamp(r.accuracy, 0, 1) + level * 3 + (isRecord ? 25 : 0) + Math.min(20, durationMs / 9000));
  const before = levelFromXp(s.xp).level;
  const today = dayKey();
  const newAchievements: string[] = [];

  update((d) => {
    d.sessions.push(session);
    if (d.sessions.length > 4000) d.sessions.splice(0, d.sessions.length - 4000);
    d.levels[def.id] = newLevel;
    d.xp += xp;
    d.activity[today] = (d.activity[today] ?? 0) + durationMs / 60000;
    // racha
    if (d.streak.lastDay !== today) {
      const y = dayKey(Date.now() - 86_400_000);
      d.streak.current = d.streak.lastDay === y ? d.streak.current + 1 : 1;
      d.streak.lastDay = today;
      d.streak.best = Math.max(d.streak.best, d.streak.current);
    }
    if (d.routine && d.routine.day === today && d.routine.items.includes(def.id) && !d.routine.done.includes(def.id)) d.routine.done.push(def.id);
    for (const a of ACHIEVEMENTS) {
      if (!d.achievements[a.id] && a.check(d, { session, def, isRecord })) {
        d.achievements[a.id] = Date.now();
        newAchievements.push(a.id);
      }
    }
  });
  const after = levelFromXp(getState().xp).level;
  return { session, xp, prevBest, avg, isRecord, newLevel, levelChange: newLevel - level, playerLevelUp: after > before, newAchievements };
}

// ───────── Perfil cognitivo ─────────
/** Índice por dominio: media de las últimas sesiones (ponderada a lo reciente) de cada juego del dominio. */
export function domainProfile(s: AppState, domainOf: Record<string, Domain>): Record<Domain, number | null> {
  const byGame: Record<string, number> = {};
  for (const ses of s.sessions) {
    const prev = byGame[ses.gameId];
    byGame[ses.gameId] = prev === undefined ? ses.normalized : prev * 0.6 + ses.normalized * 0.4;
  }
  const out = {} as Record<Domain, number | null>;
  for (const d of DOMAINS) {
    const vals = Object.entries(byGame)
      .filter(([g]) => domainOf[g] === d.id)
      .map(([, v]) => v);
    const assess = s.profile.assessment?.[d.id];
    if (vals.length) {
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      out[d.id] = Math.round(assess !== undefined && vals.length < 3 ? (m * vals.length + assess) / (vals.length + 1) : m);
    } else out[d.id] = assess !== undefined ? Math.round(assess) : null;
  }
  return out;
}

export function weeklyMinutes(s: AppState) {
  const days: { key: string; label: string; minutes: number }[] = [];
  const names = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const k = dayKey(d);
    days.push({ key: k, label: names[d.getDay()], minutes: Math.round(s.activity[k] ?? 0) });
  }
  return days;
}

/** Racha vigente (se pierde si ayer no se entrenó). */
export function liveStreak(s: AppState) {
  const t = dayKey();
  const y = dayKey(Date.now() - 86_400_000);
  return s.streak.lastDay === t || s.streak.lastDay === y ? s.streak.current : 0;
}
