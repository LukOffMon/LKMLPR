import type { Card, Deck } from '../core/types';

const CAPITALES: [string, string][] = [
  ['Australia', 'Canberra'], ['Canadá', 'Ottawa'], ['Turquía', 'Ankara'], ['Nueva Zelanda', 'Wellington'], ['Marruecos', 'Rabat'],
  ['Suiza', 'Berna'], ['Vietnam', 'Hanói'], ['Kazajistán', 'Astaná'], ['Nigeria', 'Abuya'], ['Brasil', 'Brasilia'],
  ['Bolivia (sede de gobierno)', 'La Paz'], ['Myanmar', 'Naipyidó'], ['Sri Lanka (legislativa)', 'Sri Jayawardenapura Kotte'], ['Tanzania', 'Dodoma'], ['Islandia', 'Reikiavik'],
  ['Mongolia', 'Ulán Bator'], ['Eslovenia', 'Liubliana'], ['Paraguay', 'Asunción'], ['Filipinas', 'Manila'], ['Etiopía', 'Adís Abeba'],
];

const CIENCIA: [string, string][] = [
  ['Velocidad de la luz en el vacío', '≈ 299 792 km/s'], ['Número de Avogadro', '6,022 × 10²³ mol⁻¹'], ['Hipocampo', 'Estructura cerebral clave para formar nuevos recuerdos declarativos'],
  ['Curva del olvido', 'Ebbinghaus (1885): la retención cae de forma aproximadamente exponencial sin repaso'], ['Efecto de espaciado', 'Repasos distribuidos en el tiempo producen mejor retención que repasos masivos'],
  ['Efecto de prueba', 'Recuperar activamente la información la consolida más que releerla'], ['Span de memoria de trabajo', 'Cowan: unos 4 ± 1 elementos (chunks)'], ['Neuroplasticidad', 'Capacidad del cerebro para reorganizar sus conexiones con la experiencia'],
];

export function seedDecks(): { decks: Deck[]; cards: Card[] } {
  const now = Date.now();
  const decks: Deck[] = [
    { id: 'capitales', name: 'Capitales difíciles', color: '#a78bfa', created: now },
    { id: 'ciencia', name: 'Ciencia de la memoria', color: '#22d3ee', created: now },
    { id: 'vocab', name: 'Vocabulario NEXUS', color: '#f472b6', created: now, system: true },
  ];
  const mk = (deckId: string, [front, back]: [string, string], i: number): Card => ({
    id: `${deckId}-${i}`,
    deckId,
    front,
    back,
    ease: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: now,
    created: now,
  });
  const cards = [...CAPITALES.map((c, i) => mk('capitales', c, i)), ...CIENCIA.map((c, i) => mk('ciencia', c, i))];
  return { decks, cards };
}
