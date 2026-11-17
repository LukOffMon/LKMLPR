import type { Domain } from './types';

export interface DomainInfo {
  id: Domain;
  name: string;
  short: string;
  color: string;
  description: string;
}

export const DOMAINS: DomainInfo[] = [
  { id: 'memoria', name: 'Memoria', short: 'MEM', color: '#a78bfa', description: 'Codificar, almacenar y recuperar información con técnicas mnemotécnicas.' },
  { id: 'atencion', name: 'Atención', short: 'ATN', color: '#22d3ee', description: 'Memoria de trabajo, control inhibitorio y atención sostenida.' },
  { id: 'velocidad', name: 'Velocidad', short: 'VEL', color: '#fbbf24', description: 'Velocidad de procesamiento y tiempo de reacción.' },
  { id: 'razonamiento', name: 'Razonamiento', short: 'RAZ', color: '#34d399', description: 'Inteligencia fluida, deducción y resolución de problemas.' },
  { id: 'espacial', name: 'Espacial', short: 'ESP', color: '#60a5fa', description: 'Rotación mental, visualización y orientación.' },
  { id: 'lenguaje', name: 'Lenguaje', short: 'LEN', color: '#f472b6', description: 'Fluidez verbal, vocabulario y manipulación de palabras.' },
  { id: 'calculo', name: 'Cálculo', short: 'CAL', color: '#a3e635', description: 'Aritmética mental, estimación y cálculo de calendario.' },
  { id: 'creatividad', name: 'Creatividad', short: 'CRE', color: '#fb923c', description: 'Pensamiento divergente, asociación remota y lateral.' },
  { id: 'metacognicion', name: 'Metacognición', short: 'MET', color: '#cbd5e1', description: 'Saber lo que sabes: calibración de la confianza.' },
];

export const DOMAIN: Record<Domain, DomainInfo> = Object.fromEntries(DOMAINS.map((d) => [d.id, d])) as Record<Domain, DomainInfo>;
