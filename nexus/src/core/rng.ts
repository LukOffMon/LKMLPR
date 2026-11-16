export const rand = (n: number) => Math.floor(Math.random() * n);
export const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p: number) => Math.random() < p;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: readonly T[], k: number): T[] {
  return shuffle(arr).slice(0, k);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const dayKey = (d: Date | number = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Normaliza texto para comparar respuestas: minúsculas, sin tildes, sin espacios extra. */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zñ0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Mapea linealmente v de [a,b] a [0,100] con recorte. */
export const scale = (v: number, a: number, b: number) => clamp(((v - a) / (b - a)) * 100, 0, 100);
