import { sfx } from './audio';

type Ev = 'success' | 'fail' | 'burst';
const listeners = new Set<(e: Ev) => void>();

export const bus = {
  on(fn: (e: Ev) => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  emit(e: Ev) {
    listeners.forEach((l) => l(e));
  },
};

/** Feedback estándar de acierto/error: sonido + destello de la red neuronal. */
export function feedback(ok: boolean) {
  if (ok) {
    sfx.correct();
    bus.emit('success');
  } else {
    sfx.wrong();
    bus.emit('fail');
  }
}
