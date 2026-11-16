import type { PaoEntry } from '../core/types';

/**
 * Sistema Mayor en español (fonético):
 * 0 = s, z, c(e,i) · 1 = t, d · 2 = n, ñ · 3 = m · 4 = r, rr · 5 = l, ll
 * 6 = ch, j, g(e,i), y(+vocal) · 7 = k, q, c(a,o,u), g(a,o,u) · 8 = f, v · 9 = p, b
 * Vocales, h y w no cuentan.
 */
export const MAJOR_TABLE: { d: number; sounds: string }[] = [
  { d: 0, sounds: 's, z, c suave (ce, ci)' },
  { d: 1, sounds: 't, d' },
  { d: 2, sounds: 'n, ñ' },
  { d: 3, sounds: 'm' },
  { d: 4, sounds: 'r, rr' },
  { d: 5, sounds: 'l, ll' },
  { d: 6, sounds: 'ch, j, g suave (ge, gi), y + vocal' },
  { d: 7, sounds: 'k, q, c dura, g dura' },
  { d: 8, sounds: 'f, v' },
  { d: 9, sounds: 'p, b' },
];

const W = `seso seda sana suma zorro sal soja saco sofá sapo
taza dedo tina domo toro tela teja taco tofu tapa
nuez nido nana Nemo noria Nilo nicho nuca nave nube
mesa moto mono momia muro mula mecha moco mafia mapa
rosa rata rana rama aurora rulo reja roca rifa ropa
lazo lata luna lima loro lila lija lago lava lupa
choza jota genio Jaime jarra jaula chucho jaca jefe chapa
casa gato cono cama carro cola coche coco café copa
vaso foto vino fama faro vela faja foca Fifí fobia
peso pato pino puma pera pala pecho boca pavo bebé`;

export const DEFAULT_MAJOR: Record<string, string> = Object.fromEntries(
  W.split(/\s+/).map((w, i) => [String(i).padStart(2, '0'), w]),
);

/** Codifica una palabra española a dígitos según el Sistema Mayor. */
export function majorEncode(word: string): string {
  const w = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-̂̄-ͯ]/g, '') // conserva la virgulilla de ñ (U+0303)
    .normalize('NFC')
    .replace(/[^a-zñ]/g, '');
  let out = '';
  let last = '';
  const vowel = (c: string | undefined) => !!c && 'aeiou'.includes(c);
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const n = w[i + 1];
    let d = '';
    if (c === 'c' && n === 'h') {
      d = '6';
      i++;
    } else if (c === 'l' && n === 'l') {
      d = '5';
      i++;
    } else if (c === 'r' && n === 'r') {
      d = '4';
      i++;
    } else if (c === 'q') {
      d = '7';
      if (n === 'u') i++;
    } else if (c === 'c') d = n === 'e' || n === 'i' ? '0' : '7';
    else if (c === 'g') {
      if (n === 'e' || n === 'i') d = '6';
      else {
        d = '7';
        if (n === 'u' && (w[i + 2] === 'e' || w[i + 2] === 'i')) i++;
      }
    } else if (c === 'y') d = vowel(n) ? '6' : '';
    else if (c === 'x') d = '70';
    else
      d =
        ({ s: '0', z: '0', t: '1', d: '1', n: '2', ñ: '2', m: '3', r: '4', l: '5', j: '6', k: '7', f: '8', v: '8', p: '9', b: '9' } as Record<string, string>)[c] ?? '';
    // consonantes dobles idénticas cuentan una vez (ej. "cc" no aplica, pero "ss" sí)
    if (d && !(d === last && w[i - 1] === c)) out += d;
    last = d || (vowel(c) ? '' : last);
  }
  return out;
}

export const DEFAULT_PAO: Record<string, PaoEntry> = {
  '00': { p: 'Sócrates', a: 'bebe cicuta', o: 'copa' },
  '01': { p: 'Salvador Dalí', a: 'derrite', o: 'reloj' },
  '07': { p: 'James Bond', a: 'dispara', o: 'pistola' },
  '10': { p: 'Tesla', a: 'electrifica', o: 'bobina' },
  '11': { p: 'Darth Vader', a: 'estrangula', o: 'sable láser' },
  '13': { p: 'Tom Hanks', a: 'corre', o: 'caja de bombones' },
  '23': { p: 'Michael Jordan', a: 'encesta', o: 'balón' },
  '30': { p: 'Messi', a: 'regatea', o: 'pelota' },
  '31': { p: 'Mozart', a: 'compone', o: 'piano' },
  '33': { p: 'Marilyn Monroe', a: 'sopla', o: 'vestido blanco' },
  '41': { p: 'Robin Hood', a: 'lanza una flecha', o: 'arco' },
  '42': { p: 'Rafa Nadal', a: 'muerde', o: 'trofeo' },
  '52': { p: 'Leonardo da Vinci', a: 'pinta', o: 'pincel' },
  '61': { p: 'Jedi Yoda', a: 'levita', o: 'nave X-wing' },
  '70': { p: 'Cleopatra', a: 'se baña en', o: 'leche' },
  '71': { p: 'Gandhi', a: 'hila', o: 'rueca' },
  '77': { p: 'Cristóbal Colón', a: 'navega', o: 'carabela' },
  '81': { p: 'Frida Kahlo', a: 'se peina', o: 'flores' },
  '91': { p: 'Picasso', a: 'rompe', o: 'cubo' },
  '94': { p: 'Pablo Neruda', a: 'recita', o: 'poema' },
};
