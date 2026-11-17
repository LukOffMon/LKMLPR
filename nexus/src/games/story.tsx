import { useMemo, useRef, useState } from 'react';
import type { GameDef, GameProps } from '../core/types';
import { feedback } from '../core/bus';
import { clamp, pick, randInt, sample, shuffle } from '../core/rng';
import { C, Choices, useFinish } from './kit';
import { Button, GameHud, TimerRing, useCountdown } from '../components/ui';

const PEOPLE = ['Lucía Ferrer', 'Tomás Ibarra', 'Marta Quiroga', 'Andrés Soler', 'Inés Valdés', 'Rubén Ochoa', 'Elisa Montero', 'Julián Paredes', 'Nora Castillo', 'Óscar Lemus'];
const JOBS = ['restauradora de relojes', 'cartógrafo', 'apicultora', 'farero', 'luthier', 'vulcanóloga', 'sommelier', 'traductor de latín', 'buceadora científica', 'astrónomo aficionado'];
const CITIES = ['Valparaíso', 'Oaxaca', 'Granada', 'Cusco', 'Montevideo', 'Cartagena', 'Salamanca', 'Mendoza', 'Bilbao', 'Antigua'];
const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TRANSPORT = ['un tren nocturno', 'una furgoneta amarilla', 'un velero', 'una bicicleta eléctrica', 'un autobús de dos pisos', 'una avioneta'];
const COLORS = ['verde esmeralda', 'rojo carmín', 'azul cobalto', 'amarillo mostaza', 'violeta', 'naranja'];
const OBJECTS = ['un mapa antiguo', 'una brújula rota', 'un violín sin cuerdas', 'una caja de semillas', 'un telescopio de latón', 'un diario de bitácora', 'una llave de hierro', 'un frasco de miel'];
const ANIMALS = ['un gato tuerto', 'un loro gris', 'una tortuga', 'un perro galgo', 'un búho', 'una cabra'];
const FOODS = ['sopa de lentejas', 'empanadas de queso', 'arroz con calamares', 'tamales', 'tortilla de patatas', 'ceviche'];
const GOALS = ['devolver un objeto a su dueño', 'resolver un enigma familiar', 'reparar un instrumento centenario', 'encontrar a un viejo amigo', 'cerrar un trato comercial', 'fotografiar un eclipse'];

interface Q { q: string; a: string; opts: string[] }

function makeStory(level: number) {
  const pool = <T,>(arr: T[], a: T) => shuffle([a, ...sample(arr.filter((x) => x !== a), 3)]);
  const p = pick(PEOPLE), p2 = pick(PEOPLE.filter((x) => x !== p));
  const job = pick(JOBS), city = pick(CITIES), day = pick(DAYS), month = pick(MONTHS), tr = pick(TRANSPORT), col = pick(COLORS);
  const obj = pick(OBJECTS), animal = pick(ANIMALS), food = pick(FOODS), goal = pick(GOALS);
  const hour = randInt(6, 11), bags = randInt(2, 9), price = randInt(12, 95), floor = randInt(2, 14), age = randInt(23, 79);
  const s1 = `Un ${day} de ${month}, ${p}, ${job} de ${age} años, salió hacia ${city} a las ${hour} de la mañana en ${tr} de color ${col}.`;
  const s2 = `Llevaba ${bags} maletas y ${obj}, porque su objetivo era ${goal}.`;
  const s3 = `En la estación le esperaba ${p2}, acompañado de ${animal}. Comieron ${food} en una fonda del puerto y pagaron ${price} monedas.`;
  const s4 = `Después subieron al piso ${floor} de un edificio antiguo, donde encontraron una puerta pintada de ${pick(COLORS.filter((c) => c !== col))}.`;
  const nums = (n: number, lo: number, hi: number) => shuffle([String(n), ...sample([...Array(hi - lo + 1)].map((_, i) => String(lo + i)).filter((x) => x !== String(n)), 3)]);
  const qs: Q[] = [
    { q: '¿Quién viajó?', a: p, opts: pool(PEOPLE.filter((x) => x !== p2), p) },
    { q: '¿A qué ciudad fue?', a: city, opts: pool(CITIES, city) },
    { q: '¿Qué día de la semana salió?', a: day, opts: pool(DAYS, day) },
    { q: '¿En qué medio de transporte?', a: tr, opts: pool(TRANSPORT, tr) },
    { q: '¿De qué color era el transporte?', a: col, opts: pool(COLORS, col) },
    { q: '¿Cuántas maletas llevaba?', a: String(bags), opts: nums(bags, 2, 9) },
    { q: '¿Qué objeto llevaba?', a: obj, opts: pool(OBJECTS, obj) },
    { q: '¿Cuál era su objetivo?', a: goal, opts: pool(GOALS, goal) },
    { q: '¿Con qué animal iba la persona que esperaba?', a: animal, opts: pool(ANIMALS, animal) },
    { q: '¿Qué comieron?', a: food, opts: pool(FOODS, food) },
    { q: '¿Cuántas monedas pagaron?', a: String(price), opts: shuffle([String(price), String(price + randInt(1, 9)), String(Math.max(1, price - randInt(1, 9))), String(price + 10)]) },
    { q: '¿Cuál era su profesión?', a: job, opts: pool(JOBS, job) },
    { q: '¿En qué mes ocurrió?', a: month, opts: pool(MONTHS, month) },
    { q: '¿A qué hora salió?', a: `${hour}:00`, opts: nums(hour, 6, 11).map((x) => `${x}:00`) },
    { q: '¿A qué piso subieron?', a: String(floor), opts: nums(floor, 2, 14) },
    { q: '¿Qué edad tenía?', a: String(age), opts: shuffle([String(age), String(age + 3), String(age - 4), String(age + 7)]) },
  ];
  const nSent = level <= 2 ? 2 : level <= 5 ? 3 : 4;
  const text = [s1, s2, s3, s4].slice(0, nSent).join(' ');
  const avail = qs.filter((q) => {
    const idx = qs.indexOf(q);
    const sentenceOf = [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 0, 0, 0, 3, 0][idx];
    return sentenceOf < nSent;
  });
  const nQ = clamp(3 + Math.floor(level / 2), 4, 10);
  return { text, qs: sample(avail, Math.min(nQ, avail.length)) };
}

function Story({ level, short, onFinish }: GameProps) {
  const finish = useFinish(onFinish);
  const { text, qs } = useMemo(() => makeStory(short ? 2 : level), [level, short]);
  const readTime = Math.round(text.split(' ').length * 0.45 + 6);
  const [phase, setPhase] = useState<'read' | 'quiz'>('read');
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = useRef(0);
  const left = useCountdown(readTime, phase === 'read', () => setPhase('quiz'));

  if (phase === 'read')
    return (
      <div className="mx-auto max-w-2xl">
        <GameHud>
          <span>Lee con atención y visualiza la escena</span>
          <TimerRing left={left} total={readTime} color={C.mem} />
        </GameHud>
        <p className="rounded-2xl border border-white/[.07] bg-ink-900/60 p-6 text-lg leading-relaxed text-ink-100">{text}</p>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setPhase('quiz')}>
            Ya lo tengo
          </Button>
        </div>
      </div>
    );
  const q = qs[i];
  return (
    <div className="mx-auto max-w-2xl">
      <GameHud>
        <span>
          Pregunta {i + 1}/{qs.length}
        </span>
        <span>Aciertos: {correct.current}</span>
      </GameHud>
      <h3 className="mb-4 font-display text-xl font-semibold">{q.q}</h3>
      <Choices
        options={q.opts}
        disabled={!!picked}
        state={(o) => (!picked ? null : o === q.a ? 'ok' : o === picked ? 'bad' : 'dim')}
        render={(o) => <span>{o}</span>}
        onPick={(o) => {
          const ok = o === q.a;
          if (ok) correct.current++;
          feedback(ok);
          setPicked(o);
          setTimeout(() => {
            setPicked(null);
            if (i + 1 < qs.length) setI(i + 1);
            else finish({ score: correct.current, accuracy: correct.current / qs.length, summary: `${correct.current}/${qs.length} detalles recordados` });
          }, 900);
        }}
      />
    </div>
  );
}

export const story: GameDef = {
  id: 'story',
  name: 'Memoria de historias',
  domain: 'memoria',
  tagline: 'Lee un relato breve y recuerda cada detalle.',
  instructions: ['Lee el relato (tienes tiempo limitado).', 'Después responderás preguntas sobre detalles concretos.', 'Visualiza la escena como una película: colores, números y personajes.'],
  why: 'Convertir el texto en imágenes mentales (codificación dual) y conectar los detalles en una escena coherente mejora el recuerdo. Las preguntas fuerzan la recuperación activa, que consolida mejor que releer.',
  maxLevel: 12,
  scoreUnit: 'detalles',
  higherBetter: true,
  normalize: (r, level) => clamp(r.accuracy * 60 + level * 4, 0, 100),
  Component: Story,
};
