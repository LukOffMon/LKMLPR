import type { Categoria } from '../types'

export const CATEGORIAS: Categoria[] = [
  {
    id: 'local',
    nombre: 'Servicios digitales para negocios locales',
    corto: 'Negocios locales',
    descripcion: 'Restaurantes, consultorios, barberías, talleres y tiendas de Jesús María y Aguascalientes que necesitan presencia digital y no saben (ni quieren) hacerla.',
    color: '#d4af37',
  },
  {
    id: 'freelance',
    nombre: 'Freelance en línea',
    corto: 'Freelance',
    descripcion: 'Clientes de todo México y del extranjero. Trabajas desde casa con tu PC; tu competencia es global, tu ventaja es la IA y la velocidad.',
    color: '#34d399',
  },
  {
    id: 'tech',
    nombre: 'Tecnología y software',
    corto: 'Software',
    descripcion: 'Construir una vez y vender muchas. Más lento al primer peso, pero es el camino a activos que generan dinero sin tu tiempo.',
    color: '#60a5fa',
  },
  {
    id: 'comercio',
    nombre: 'Compra-venta y comercio',
    corto: 'Comercio',
    descripcion: 'Comprar bien y vender mejor. Aprendes negociación, precios y flujo de efectivo — la base de cualquier negocio.',
    color: '#f59e0b',
  },
  {
    id: 'tecnico',
    nombre: 'Servicios técnicos',
    corto: 'Técnico',
    descripcion: 'Las PCs se descomponen siempre. Servicio confiable a domicilio en Jesús María y Ags, con demanda de familias, estudiantes y PyMEs.',
    color: '#a78bfa',
  },
  {
    id: 'educacion',
    nombre: 'Educación',
    corto: 'Educación',
    descripcion: 'Enseñar lo que ya sabes. Ingresos rápidos con asesorías y, después, cursos que se venden solos.',
    color: '#f472b6',
  },
  {
    id: 'contenido',
    nombre: 'Contenido y audiencia',
    corto: 'Audiencia',
    descripcion: 'Atención = oportunidades. Lento al inicio, pero multiplica todo lo demás: clientes, socios, ventas de productos.',
    color: '#fb7185',
  },
  {
    id: 'escala',
    nombre: 'Negocios de escala (etapa avanzada)',
    corto: 'Escala',
    descripcion: 'Lo que construyes cuando ya tienes habilidades, clientes y capital. No empieces aquí: llega aquí.',
    color: '#e6c260',
  },
]

export const categoriaPorId = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c])) as Record<
  Categoria['id'],
  Categoria
>
