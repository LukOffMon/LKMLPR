import type { ComponentType } from 'react';

export type Domain =
  | 'memoria'
  | 'atencion'
  | 'velocidad'
  | 'razonamiento'
  | 'espacial'
  | 'lenguaje'
  | 'calculo'
  | 'creatividad'
  | 'metacognicion';

export interface Settings {
  sessionMinutes: number;
  sound: boolean;
  volume: number;
  voice: boolean;
  reduceMotion: 'system' | 'on' | 'off';
  focusMode: boolean;
  metacog: boolean;
}

/** Lo que un juego devuelve al terminar. */
export interface RawResult {
  /** Puntuación principal en la unidad del juego (aciertos, span, ms...). */
  score: number;
  /** Precisión 0–1 usada por el staircase adaptativo. */
  accuracy: number;
  /** Si el juego decide su siguiente nivel (p. ej. tareas de span). */
  nextLevel?: number;
  metrics?: Record<string, number>;
  /** Línea breve con lo más destacado de la sesión. */
  summary?: string;
}

export interface GameProps {
  level: number;
  /** Versión corta (evaluación inicial o práctica). */
  short: boolean;
  practice: boolean;
  onFinish: (r: RawResult) => void;
}

export interface GameDef {
  id: string;
  name: string;
  domain: Domain;
  tagline: string;
  instructions: string[];
  why: string;
  keys?: string;
  maxLevel: number;
  scoreUnit: string;
  /** false = menor es mejor (tiempos). */
  higherBetter: boolean;
  /** Convierte un resultado en un índice 0–100 para el perfil cognitivo. */
  normalize: (r: RawResult, level: number) => number;
  Component: ComponentType<GameProps>;
  /** Herramienta con gestor propio (palacios, SRS...). */
  tool?: boolean;
  /** Id de nodo del árbol de habilidades necesario para jugarlo. */
  gate?: string;
  minutes?: number;
}

export interface Session {
  id: string;
  gameId: string;
  domain?: Domain;
  ts: number;
  score: number;
  accuracy: number;
  level: number;
  normalized: number;
  durationMs: number;
  metrics?: Record<string, number>;
  predicted?: number;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  ease: number;
  interval: number; // días
  reps: number;
  lapses: number;
  due: number; // timestamp
  created: number;
  lastReview?: number;
}

export interface Deck {
  id: string;
  name: string;
  color: string;
  created: number;
  system?: boolean;
}

export interface Review {
  ts: number;
  cardId: string;
  grade: 0 | 1 | 2 | 3;
}

export interface Locus {
  id: string;
  name: string;
  icon: string;
  x: number; // 0–100
  y: number; // 0–100
}

export interface Palace {
  id: string;
  name: string;
  loci: Locus[];
  created: number;
  /** Último contenido memorizado: índice de locus → elemento. */
  items?: string[];
}

export interface CalibrationPoint {
  ts: number;
  conf: number; // 0.5–1 (o 0–1 en predicciones)
  correct: boolean;
  source: string;
}

export interface PaoEntry {
  p: string;
  a: string;
  o: string;
}

export interface AppState {
  version: 1;
  profile: {
    name: string;
    createdAt: number;
    onboarded: boolean;
    assessment?: Partial<Record<Domain, number>>;
  };
  settings: Settings;
  xp: number;
  streak: { current: number; best: number; lastDay: string | null };
  levels: Record<string, number>;
  sessions: Session[];
  achievements: Record<string, number>;
  decks: Deck[];
  cards: Card[];
  reviews: Review[];
  palaces: Palace[];
  major: Record<string, string>;
  pao: Record<string, PaoEntry>;
  calibration: CalibrationPoint[];
  routine: { day: string; items: string[]; done: string[] } | null;
  flags: Record<string, boolean>;
  activity: Record<string, number>; // día → minutos
}
