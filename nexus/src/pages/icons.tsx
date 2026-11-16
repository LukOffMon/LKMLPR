import * as I from 'lucide-react';

const MAP: Record<string, I.LucideIcon> = {
  palace: I.Castle, srs: I.Layers, major: I.Binary, faces: I.ScanFace, digits: I.Hash, corsi: I.Grid3x3, matrix: I.LayoutGrid, pairs: I.Copy, story: I.BookOpenText,
  nback: I.Radio, mot: I.Orbit, flanker: I.ArrowLeftRight, gonogo: I.CircleSlash, stroop: I.Palette, digitsback: I.Undo2,
  schulte: I.Table2, reaction: I.Timer, search: I.ScanSearch,
  raven: I.Shapes, series: I.TrendingUp, sudoku: I.Grid3x3, nonogram: I.SquareDashed, zebra: I.Puzzle, hanoi: I.Layers3,
  rotation: I.Rotate3d, paperfold: I.FileStack, maze: I.Route, tangram: I.Triangle,
  anagram: I.ALargeSmall, fluency: I.MessageSquareText, vocab: I.BookA,
  arithmetic: I.Calculator, dates: I.CalendarDays, estimation: I.Gauge, kakuro: I.Sigma,
  altuses: I.Lightbulb, rat: I.Link2, lateral: I.Sparkles, calibration: I.Crosshair,
};

export function GameIcon({ id, color, size = 20 }: { id: string; color: string; size?: number }) {
  const Icon = MAP[id] ?? I.Brain;
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}1c`, boxShadow: `inset 0 0 0 1px ${color}33` }}>
      <Icon size={size} color={color} />
    </div>
  );
}
