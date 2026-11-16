import { useSyncExternalStore } from 'react';
import { produce } from 'immer';
import type { AppState } from './types';
import { DEFAULT_MAJOR, DEFAULT_PAO } from '../data/major';
import { seedDecks } from '../data/decks';

const KEY = 'nexus.v1';

export function initialState(): AppState {
  const { decks, cards } = seedDecks();
  return {
    version: 1,
    profile: { name: '', createdAt: Date.now(), onboarded: false },
    settings: { sessionMinutes: 20, sound: true, volume: 0.7, voice: true, reduceMotion: 'system', focusMode: true, metacog: true },
    xp: 0,
    streak: { current: 0, best: 0, lastDay: null },
    levels: {},
    sessions: [],
    achievements: {},
    decks,
    cards,
    reviews: [],
    palaces: [
      {
        id: 'casa',
        name: 'Mi casa',
        created: Date.now(),
        loci: [
          { id: 'l1', name: 'Puerta de entrada', icon: 'door', x: 12, y: 84 },
          { id: 'l2', name: 'Felpudo', icon: 'mat', x: 24, y: 72 },
          { id: 'l3', name: 'Perchero', icon: 'coat', x: 18, y: 52 },
          { id: 'l4', name: 'Sofá', icon: 'sofa', x: 36, y: 40 },
          { id: 'l5', name: 'Televisión', icon: 'tv', x: 30, y: 18 },
          { id: 'l6', name: 'Mesa del comedor', icon: 'table', x: 54, y: 28 },
          { id: 'l7', name: 'Nevera', icon: 'fridge', x: 72, y: 14 },
          { id: 'l8', name: 'Fregadero', icon: 'sink', x: 86, y: 30 },
          { id: 'l9', name: 'Escalera', icon: 'stairs', x: 70, y: 52 },
          { id: 'l10', name: 'Baño', icon: 'bath', x: 86, y: 70 },
          { id: 'l11', name: 'Cama', icon: 'bed', x: 62, y: 80 },
          { id: 'l12', name: 'Ventana', icon: 'window', x: 44, y: 66 },
        ],
      },
    ],
    major: { ...DEFAULT_MAJOR },
    pao: { ...DEFAULT_PAO },
    calibration: [],
    routine: null,
    flags: {},
    activity: {},
  };
}

function load(): AppState {
  const base = initialState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return mergeState(base, parsed);
  } catch {
    return base;
  }
}

/** Combina un estado guardado con los valores por defecto (para versiones futuras). */
export function mergeState(base: AppState, parsed: Partial<AppState>): AppState {
  return {
    ...base,
    ...parsed,
    profile: { ...base.profile, ...(parsed.profile ?? {}) },
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
    streak: { ...base.streak, ...(parsed.streak ?? {}) },
    major: { ...base.major, ...(parsed.major ?? {}) },
    version: 1,
  };
}

let state: AppState = load();
const subs = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* almacenamiento no disponible: la app sigue funcionando en memoria */
    }
  }, 150);
}

export const getState = () => state;

export function update(fn: (draft: AppState) => void) {
  state = produce(state, fn);
  persist();
  subs.forEach((s) => s());
}

export function replaceState(next: AppState) {
  state = next;
  persist();
  subs.forEach((s) => s());
}

export function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignorar */
    }
  });
}
