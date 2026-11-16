import type { Domain, GameDef } from '../core/types';
import { palace } from './palace';
import { srs } from './srs';
import { major } from './major';
import { faces } from './faces';
import { digits, digitsBack } from './digits';
import { corsi, matrix, pairsGame } from './visualmem';
import { story } from './story';
import { nback, mot, flanker, gonogo, stroop } from './attention';
import { schulte, reaction, search } from './speed';
import { raven, series } from './reasoning';
import { sudoku, nonogram, kakuro, hanoi } from './puzzles';
import { zebra } from './zebra';
import { rotation, paperfold, maze } from './spatial';
import { tangram } from './tangram';
import { anagram, fluency, vocab } from './language';
import { arithmetic, dates, estimation } from './calc';
import { altuses, rat, lateral } from './creative';
import { calibration } from './metacog';

/** Registro central: añadir un juego = importarlo y añadirlo aquí. */
export const GAMES: GameDef[] = [
  palace, srs, major, faces, digits, corsi, matrix, pairsGame, story,
  nback, mot, flanker, gonogo, stroop, digitsBack,
  schulte, reaction, search,
  raven, series, sudoku, nonogram, zebra, hanoi,
  rotation, paperfold, maze, tangram,
  anagram, fluency, vocab,
  arithmetic, dates, estimation, kakuro,
  altuses, rat, lateral,
  calibration,
];

export const GAME: Record<string, GameDef> = Object.fromEntries(GAMES.map((g) => [g.id, g]));
export const DOMAIN_OF: Record<string, Domain> = Object.fromEntries(GAMES.map((g) => [g.id, g.domain]));

/** Batería de evaluación inicial (~9 min): un ejercicio corto por dominio. */
export const ASSESSMENT = ['digits', 'flanker', 'reaction', 'raven', 'rotation', 'anagram', 'arithmetic', 'rat', 'calibration'];

/** Juegos donde tiene sentido pedir una predicción de precisión (metacognición). */
export const PREDICTABLE = new Set(['digits', 'digitsback', 'corsi', 'faces', 'story', 'raven', 'series', 'rotation', 'paperfold', 'vocab', 'dates', 'estimation', 'flanker', 'gonogo', 'mot', 'matrix', 'rat', 'major']);
