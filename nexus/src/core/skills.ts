import type { AppState, Domain } from './types';

export interface SkillNode {
  id: string;
  name: string;
  domain: Domain;
  desc: string;
  requires: string[];
  /** Devuelve progreso 0–1 y un texto con lo que falta. */
  progress: (s: AppState) => { p: number; label: string };
  unlocks?: string;
  col: number;
  row: number;
}

const sess = (s: AppState, id: string) => s.sessions.filter((x) => x.gameId === id);
const goodSess = (s: AppState, id: string, acc: number) => sess(s, id).filter((x) => x.accuracy >= acc).length;
const best = (s: AppState, id: string) => Math.max(0, ...sess(s, id).map((x) => x.score));
const lvl = (s: AppState, id: string) => s.levels[id] ?? 1;
const frac = (v: number, goal: number, unit: string) => ({ p: Math.min(1, v / goal), label: `${Math.min(v, goal)}/${goal} ${unit}` });

export const SKILLS: SkillNode[] = [
  { id: 'loci', name: 'Método de loci', domain: 'memoria', col: 0, row: 0, requires: [], desc: 'Asociar información a lugares de un recorrido conocido.', progress: (s) => frac(s.flags.palaceTutorial ? 1 : 0, 1, 'tutorial') },
  { id: 'multipalace', name: 'Red de palacios', domain: 'memoria', col: 0, row: 1, requires: ['loci'], desc: 'Varios palacios para no sobrescribir recuerdos.', progress: (s) => frac(s.palaces.length, 3, 'palacios') },
  { id: 'loci20', name: 'Recorrido largo', domain: 'memoria', col: 0, row: 2, requires: ['multipalace'], desc: 'Recordar 15 elementos en un solo recorrido.', progress: (s) => frac(best(s, 'palace'), 15, 'elementos') },
  { id: 'major', name: 'Sistema Mayor', domain: 'memoria', col: 1, row: 0, requires: [], desc: 'Convertir dígitos en consonantes y palabras imaginables.', progress: (s) => frac(goodSess(s, 'major', 0.8), 3, 'sesiones ≥80 %') },
  { id: 'pao', name: 'Sistema PAO', domain: 'memoria', col: 1, row: 1, requires: ['major'], unlocks: 'Modo PAO en el entrenador del Sistema Mayor', desc: 'Persona–Acción–Objeto: 6 dígitos en una sola imagen.', progress: (s) => frac(Object.keys(s.pao).length, 20, 'entradas PAO') },
  { id: 'chunk', name: 'Chunking', domain: 'memoria', col: 2, row: 0, requires: [], desc: 'Agrupar elementos para superar el límite de la memoria de trabajo.', progress: (s) => frac(best(s, 'digits'), 7, 'span de dígitos') },
  { id: 'faces', name: 'Codificación de rostros', domain: 'memoria', col: 2, row: 1, requires: ['chunk'], desc: 'Rasgo distintivo + imagen del nombre.', progress: (s) => frac(goodSess(s, 'faces', 0.8), 3, 'sesiones ≥80 %') },
  { id: 'srs', name: 'Repetición espaciada', domain: 'memoria', col: 3, row: 0, requires: [], desc: 'Repasar justo antes de olvidar.', progress: (s) => frac(s.reviews.length, 50, 'repasos') },
  { id: 'wm', name: 'Memoria de trabajo', domain: 'atencion', col: 4, row: 0, requires: [], desc: 'Mantener y actualizar información en mente.', progress: (s) => frac(lvl(s, 'nback'), 3, 'nivel N') },
  { id: 'inhib', name: 'Control inhibitorio', domain: 'atencion', col: 4, row: 1, requires: ['wm'], desc: 'Frenar la respuesta automática.', progress: (s) => frac(goodSess(s, 'stroop', 0.85) + goodSess(s, 'gonogo', 0.85) + goodSess(s, 'flanker', 0.85), 5, 'sesiones ≥85 %') },
  { id: 'speed', name: 'Visión periférica', domain: 'velocidad', col: 5, row: 0, requires: [], desc: 'Ampliar el campo de atención visual.', progress: (s) => frac(sess(s, 'schulte').length, 5, 'tablas') },
  { id: 'gorbov', name: 'Tabla de Gorbov', domain: 'velocidad', col: 5, row: 1, requires: ['speed'], unlocks: 'Variante de dos colores alternados en Schulte', desc: 'Alternar dos secuencias exige flexibilidad atencional.', progress: (s) => frac(lvl(s, 'schulte'), 3, 'nivel Schulte') },
  { id: 'fluid', name: 'Inteligencia fluida', domain: 'razonamiento', col: 6, row: 0, requires: [], desc: 'Detectar reglas abstractas en patrones nuevos.', progress: (s) => frac(goodSess(s, 'raven', 0.7), 3, 'sesiones ≥70 %') },
  { id: 'deduct', name: 'Deducción', domain: 'razonamiento', col: 6, row: 1, requires: ['fluid'], desc: 'Encadenar restricciones lógicas.', progress: (s) => frac(sess(s, 'zebra').length + sess(s, 'sudoku').length, 3, 'puzzles') },
  { id: 'rot2d', name: 'Rotación 2D', domain: 'espacial', col: 7, row: 0, requires: [], desc: 'Girar figuras en el plano mentalmente.', progress: (s) => frac(lvl(s, 'rotation'), 4, 'nivel') },
  { id: 'rot3d', name: 'Rotación 3D', domain: 'espacial', col: 7, row: 1, requires: ['rot2d'], unlocks: 'Figuras de cubos 3D en Rotación mental', desc: 'Figuras de Shepard-Metzler en el espacio.', progress: (s) => frac(lvl(s, 'rotation'), 6, 'nivel') },
  { id: 'doomsday', name: 'Algoritmo Doomsday', domain: 'calculo', col: 8, row: 0, requires: [], desc: 'Calcular el día de la semana de cualquier fecha.', progress: (s) => frac(goodSess(s, 'dates', 0.8), 3, 'sesiones ≥80 %') },
  { id: 'calib', name: 'Calibración', domain: 'metacognicion', col: 8, row: 1, requires: [], desc: 'Que tu confianza coincida con tu precisión real.', progress: (s) => frac(s.calibration.length, 60, 'juicios') },
];

export const SKILL: Record<string, SkillNode> = Object.fromEntries(SKILLS.map((x) => [x.id, x]));

export function isUnlocked(s: AppState, id: string): boolean {
  const n = SKILL[id];
  if (!n) return true;
  if (s.flags[`skill:${id}`]) return true;
  return n.requires.every((r) => isUnlocked(s, r)) && n.progress(s).p >= 1;
}

/** Un nodo es accesible (se puede trabajar) si sus requisitos están desbloqueados. */
export const isAvailable = (s: AppState, id: string) => (SKILL[id]?.requires ?? []).every((r) => isUnlocked(s, r));
