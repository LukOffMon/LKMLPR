import { createContext, useContext } from 'react';

export type View = 'inicio' | 'rutina' | 'biblioteca' | 'analiticas' | 'habilidades' | 'ajustes' | `juego-${string}`;

export interface NavCtx {
  view: View;
  go: (v: View) => void;
  play: (gameId: string) => void;
  setFocus: (f: boolean) => void;
}

export const Nav = createContext<NavCtx>({ view: 'inicio', go: () => {}, play: () => {}, setFocus: () => {} });
export const useNav = () => useContext(Nav);
