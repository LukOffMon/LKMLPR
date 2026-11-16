import type { AppState, GameDef, Session } from './types';

interface Ctx {
  session: Session;
  def: GameDef;
  isRecord: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  check: (s: AppState, c: Ctx) => boolean;
}

const count = (s: AppState, id?: string) => (id ? s.sessions.filter((x) => x.gameId === id).length : s.sessions.length);
const best = (s: AppState, id: string) => Math.max(0, ...s.sessions.filter((x) => x.gameId === id).map((x) => x.score));

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', name: 'Primera sinapsis', desc: 'Completa tu primera sesión puntuada.', check: (s) => count(s) >= 1 },
  { id: 's10', name: 'Hábito en marcha', desc: 'Completa 10 sesiones.', check: (s) => count(s) >= 10 },
  { id: 's50', name: 'Neuroplástico', desc: 'Completa 50 sesiones.', check: (s) => count(s) >= 50 },
  { id: 's200', name: 'Atleta mental', desc: 'Completa 200 sesiones.', check: (s) => count(s) >= 200 },
  { id: 'streak3', name: 'Tres días seguidos', desc: 'Entrena 3 días consecutivos.', check: (s) => s.streak.current >= 3 },
  { id: 'streak7', name: 'Semana completa', desc: 'Racha de 7 días.', check: (s) => s.streak.current >= 7 },
  { id: 'streak30', name: 'Disciplina de hierro', desc: 'Racha de 30 días.', check: (s) => s.streak.current >= 30 },
  { id: 'record', name: 'Superándote', desc: 'Bate un récord personal.', check: (_s, c) => c.isRecord },
  { id: 'perfect', name: 'Sesión perfecta', desc: 'Termina una sesión con 100 % de precisión.', check: (_s, c) => c.session.accuracy >= 0.999 },
  { id: 'span8', name: 'Ocho dígitos', desc: 'Alcanza un span de dígitos de 8.', check: (s) => best(s, 'digits') >= 8 },
  { id: 'nback3', name: 'Triple N', desc: 'Llega a Dual 3-Back.', check: (s) => (s.levels['nback'] ?? 1) >= 3 },
  { id: 'palace', name: 'Arquitecto de loci', desc: 'Recuerda 10 elementos en un recorrido del palacio.', check: (s) => best(s, 'palace') >= 10 },
  { id: 'polymath', name: 'Polímata', desc: 'Entrena los 9 dominios cognitivos.', check: (s) => new Set(s.sessions.map((x) => x.domain)).size >= 9 },
  { id: 'sudoku', name: 'Lógica pura', desc: 'Resuelve un Sudoku.', check: (s) => count(s, 'sudoku') >= 1 },
  { id: 'calib', name: 'Sé lo que sé', desc: 'Responde 50 preguntas de calibración.', check: (s) => s.calibration.length >= 50 },
  { id: 'srs100', name: 'Memoria a largo plazo', desc: 'Haz 100 repasos de tarjetas SRS.', check: (s) => s.reviews.length >= 100 },
];
