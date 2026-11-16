import type { RutaHabilidad } from '../types'

export const HABILIDADES: RutaHabilidad[] = [
  {
    id: 'ventas',
    nombre: 'Ventas',
    porQue: 'Sin ventas, ninguna otra habilidad se convierte en dinero. Es la habilidad #1 de cualquier emprendedor.',
    orden: [
      { paso: 'Fundamentos: escuchar más que hablar, preguntar por el problema', recursos: [{ nombre: 'HubSpot Academy – Inbound Sales (gratis)', url: 'https://academy.hubspot.com/' }] },
      { paso: 'Entrevistas sin sesgo', recursos: [{ nombre: '"The Mom Test" (resúmenes en YouTube)', nota: 'Cómo preguntar sin que te mientan.' }] },
      { paso: 'Ofertas irresistibles y precios', recursos: [{ nombre: 'Canal de Alex Hormozi (YouTube)', nota: 'Ofertas y ventas; toma lo práctico y deja la parte de "hustle".' }] },
      { paso: 'Práctica real', recursos: [{ nombre: 'Protocolo de prospección de esta app', nota: 'Nada sustituye 100 conversaciones reales.' }] },
    ],
    practica: 'Graba (con permiso) o anota tus llamadas de venta y revisa: ¿cuánto hablaste tú vs. el cliente?',
  },
  {
    id: 'comunicacion',
    nombre: 'Comunicación y escritura',
    porQue: 'Tus mensajes, propuestas y publicaciones son tu cara. Escribir claro = pensar claro = vender más.',
    orden: [
      { paso: 'Escritura clara y breve', recursos: [{ nombre: 'Fundéu RAE (dudas)', url: 'https://www.fundeu.es/' }, { nombre: 'Guía de escritura de Paul Graham (ensayos, inglés)', url: 'https://paulgraham.com/articles.html' }] },
      { paso: 'Hablar en público', recursos: [{ nombre: 'TED Masterclass / charlas TED sobre oratoria', url: 'https://www.ted.com/' }, { nombre: 'Clubes Toastmasters (hay en Aguascalientes)', nota: 'Verifica horarios y costos.' }] },
      { paso: 'Escribe en público', recursos: [{ nombre: 'Tu Diario semanal + 3 publicaciones/semana' }] },
    ],
    practica: 'Reescribe cada mensaje importante a la mitad de palabras antes de enviarlo.',
  },
  {
    id: 'marketing',
    nombre: 'Marketing digital',
    porQue: 'Entender cómo la gente descubre y decide comprar te sirve para tus clientes y tus propios negocios.',
    orden: [
      { paso: 'Fundamentos de marketing digital', recursos: [{ nombre: 'Google Skillshop', url: 'https://skillshop.withgoogle.com/' }, { nombre: 'HubSpot Academy – Digital Marketing', url: 'https://academy.hubspot.com/' }] },
      { paso: 'Redes sociales y anuncios', recursos: [{ nombre: 'Meta Blueprint', url: 'https://www.facebook.com/business/learn' }, { nombre: 'TikTok Academy (anuncios)', url: 'https://ads.tiktok.com/business/' }] },
      { paso: 'SEO y presencia local', recursos: [{ nombre: 'Guía SEO para principiantes de Google Search Central', url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=es' }] },
    ],
    practica: 'Haz crecer una cuenta propia (tu marca personal o página de nicho) y documenta qué funcionó.',
  },
  {
    id: 'ia',
    nombre: 'Uso avanzado de IA',
    porQue: 'Es tu ventaja injusta: con IA trabajas como un equipo de varias personas. Pero solo si la usas con criterio.',
    orden: [
      { paso: 'Prompting serio: contexto, ejemplos, formato, iteración', recursos: [{ nombre: 'Cursos de Anthropic (GitHub)', url: 'https://github.com/anthropics/courses' }, { nombre: 'Guía de ingeniería de prompts de Anthropic', url: 'https://docs.anthropic.com/' }] },
      { paso: 'IA para programar y automatizar', recursos: [{ nombre: 'Documentación de Claude Code', url: 'https://docs.anthropic.com/' }, { nombre: 'n8n – AI Agents', url: 'https://docs.n8n.io/' }] },
      { paso: 'Construir con APIs', recursos: [{ nombre: 'Claude API – Quickstart', url: 'https://docs.anthropic.com/' }] },
      { paso: 'Criterio: verificar, no copiar', recursos: [{ nombre: 'Regla de la app: entiende todo lo que entregas' }] },
    ],
    practica: 'Para cada tarea repetitiva de tu semana, pregúntate: ¿cómo la haría la IA en la mitad del tiempo?',
  },
  {
    id: 'programacion',
    nombre: 'Programación web',
    porQue: 'La habilidad con mayor techo: páginas, apps, automatizaciones, SaaS y empleos bien pagados.',
    orden: [
      { paso: 'HTML y CSS', recursos: [{ nombre: 'freeCodeCamp – Responsive Web Design', url: 'https://www.freecodecamp.org/learn' }] },
      { paso: 'JavaScript', recursos: [{ nombre: 'freeCodeCamp – JavaScript Algorithms', url: 'https://www.freecodecamp.org/learn' }, { nombre: 'javascript.info (en inglés, excelente)', url: 'https://javascript.info/' }] },
      { paso: 'Fundamentos de computación', recursos: [{ nombre: 'CS50x Harvard (gratis)', url: 'https://cs50.harvard.edu/x/' }] },
      { paso: 'React + TypeScript', recursos: [{ nombre: 'react.dev', url: 'https://react.dev/learn' }, { nombre: 'midudev (YouTube)' }] },
      { paso: 'Full stack', recursos: [{ nombre: 'The Odin Project', url: 'https://www.theodinproject.com/' }, { nombre: 'Supabase Docs', url: 'https://supabase.com/docs' }] },
    ],
    practica: 'Construye algo real cada mes y súbelo a GitHub. Proyectos > certificados.',
  },
  {
    id: 'video',
    nombre: 'Edición de video',
    porQue: 'El video es el formato que más consume la gente; editores buenos siempre tienen trabajo.',
    orden: [
      { paso: 'CapCut para shorts', recursos: [{ nombre: 'Tutoriales oficiales de CapCut' }] },
      { paso: 'DaVinci Resolve', recursos: [{ nombre: 'Capacitación oficial de Blackmagic (gratis)', url: 'https://www.blackmagicdesign.com/products/davinciresolve/training' }] },
      { paso: 'Retención y narrativa', recursos: [{ nombre: 'Analiza 10 videos virales de tu nicho segundo a segundo' }] },
    ],
    practica: '1 short editado al día durante 30 días.',
  },
  {
    id: 'diseno',
    nombre: 'Diseño',
    porQue: 'Buen gusto visual hace que todo lo que vendes parezca más valioso.',
    orden: [
      { paso: 'Fundamentos (tipografía, color, espacio)', recursos: [{ nombre: 'Canva Design School', url: 'https://www.canva.com/designschool/' }, { nombre: 'Google Fonts Knowledge', url: 'https://fonts.google.com/knowledge' }] },
      { paso: 'Figma', recursos: [{ nombre: 'Figma Learn', url: 'https://help.figma.com/' }] },
      { paso: 'Ojo crítico', recursos: [{ nombre: 'Recrea 30 diseños que admires', nota: 'Copiar para aprender, nunca para vender.' }] },
    ],
    practica: 'Rediseña 1 cosa fea que veas cada semana (menú, flyer, anuncio).',
  },
  {
    id: 'finanzas',
    nombre: 'Finanzas',
    porQue: 'Ganar dinero es la mitad; quedártelo y hacerlo crecer es la otra.',
    orden: [
      { paso: 'Finanzas personales', recursos: [{ nombre: 'Condusef – Educación financiera', url: 'https://www.condusef.gob.mx/' }, { nombre: 'Banxico Educa', url: 'https://www.banxico.org.mx/' }] },
      { paso: 'Contabilidad básica de negocio', recursos: [{ nombre: 'Khan Academy – Finanzas y mercados de capital', url: 'https://es.khanacademy.org/' }] },
      { paso: 'Impuestos en México', recursos: [{ nombre: 'Portal del SAT', url: 'https://www.sat.gob.mx/' }, { nombre: 'Un contador de confianza', nota: 'Vale cada peso.' }] },
      { paso: 'Inversión', recursos: [{ nombre: 'CETES Directo – sección educativa', url: 'https://www.cetesdirecto.com/' }] },
    ],
    practica: 'Registra cada peso en el Centro Financiero durante 90 días seguidos.',
  },
  {
    id: 'negociacion',
    nombre: 'Negociación',
    porQue: 'Precios, proveedores, socios, sueldos: todo se negocia.',
    orden: [
      { paso: 'Bases', recursos: [{ nombre: 'Coursera (modo oyente): Successful Negotiation – U. de Michigan', url: 'https://www.coursera.org/' }] },
      { paso: 'Empatía táctica', recursos: [{ nombre: '"Never Split the Difference" de Chris Voss (resúmenes y charlas gratis)' }] },
      { paso: 'Práctica', recursos: [{ nombre: 'Compra-venta en Marketplace', nota: 'Negociación real con poco en juego.' }] },
    ],
    practica: 'Antes de cada negociación escribe: tu mejor alternativa, tu mínimo y lo que el otro realmente quiere.',
  },
  {
    id: 'ingles',
    nombre: 'Inglés',
    porQue: 'Multiplica tu mercado: clientes en dólares, recursos de aprendizaje, empleos remotos.',
    orden: [
      { paso: 'Base diaria', recursos: [{ nombre: 'Duolingo (15 min/día)' }, { nombre: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish/' }] },
      { paso: 'Comprensión', recursos: [{ nombre: 'YouTube en inglés con subtítulos en inglés', nota: 'Usa contenido de tu nicho.' }] },
      { paso: 'Hablar', recursos: [{ nombre: 'Practica con IA en modo voz', nota: 'Pídele que te corrija.' }, { nombre: 'Intercambios de idiomas (Tandem, HelloTalk)' }] },
      { paso: 'Inglés de negocios', recursos: [{ nombre: 'Escribe tus propuestas en inglés y pide corrección a la IA' }] },
    ],
    practica: 'Mide tu nivel con EF SET (gratis) cada 3 meses.',
  },
]
