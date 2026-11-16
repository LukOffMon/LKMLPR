export interface Activo {
  id: string
  nombre: string
  color: string
  que: string
  tiempo: string
  alimenta: string
  genera: string
  hitos: string[]
}

export const ACTIVOS: Activo[] = [
  {
    id: 'marca', nombre: 'Marca personal', color: '#d4af37',
    que: 'Que la gente sepa quién eres, qué haces y confíe en ti antes de hablarte.',
    tiempo: '6–24 meses de constancia',
    alimenta: 'Cada proyecto de la Vía Rápida se vuelve contenido (con permiso): antes/después, procesos, aprendizajes.',
    genera: 'Clientes que llegan solos, precios más altos, socios y oportunidades.',
    hitos: ['Perfil profesional optimizado (LinkedIn/Instagram)', 'Sitio LKM\'r publicado', '30 publicaciones documentando tu camino', 'Primer cliente que llegó por tu contenido', '1,000 seguidores relevantes', 'Primera invitación a hablar (escuela, evento, podcast)'],
  },
  {
    id: 'audiencia', nombre: 'Audiencia (YouTube / TikTok / LinkedIn)', color: '#fb7185',
    que: 'Un canal de nicho con contenido útil que te pertenece y crece mientras duermes.',
    tiempo: '12–36 meses',
    alimenta: 'Fondo de Vía Larga paga micrófono, luz o un editor por pieza. La Vía Rápida te da historias reales que contar.',
    genera: 'Patrocinios, afiliados, venta de productos y distribución para todo lo que lances.',
    hitos: ['Nicho y formato definidos', '10 videos publicados', '50 videos publicados', 'Primeros 1,000 suscriptores', 'Primer ingreso del canal', 'Primer patrocinio alineado'],
  },
  {
    id: 'productos', nombre: 'Productos digitales', color: '#a78bfa',
    que: 'Plantillas, kits y cursos que nacen de servicios que ya vendiste muchas veces.',
    tiempo: '3–12 meses',
    alimenta: 'Los servicios repetidos te dicen QUÉ producto hacer; el fondo paga la plataforma y la promoción inicial.',
    genera: 'Ingreso que no depende de tus horas.',
    hitos: ['Servicio vendido 3+ veces identificado', 'Validación en el Laboratorio', 'Primera pre-venta pagada', 'Producto publicado', '10 ventas', 'Segundo producto'],
  },
  {
    id: 'saas', nombre: 'Micro-SaaS', color: '#60a5fa',
    que: 'Software por suscripción para un nicho que ya conoces por tus clientes.',
    tiempo: '6–24 meses',
    alimenta: 'Clientes de la agencia son tus primeros usuarios; el fondo paga dominio, hosting y herramientas.',
    genera: 'Ingreso recurrente mensual (MRR) escalable.',
    hitos: ['Problema repetido en 5+ clientes', '10 entrevistas con el nicho', '3 pre-ventas o compromisos', 'MVP en manos de clientes', '10 clientes pagando', 'MRR que cubre sus costos + tu tiempo'],
  },
  {
    id: 'agencia', nombre: 'Agencia LKM\'r con equipo', color: '#34d399',
    que: 'Que LKM\'r produzca sin que tú hagas todo: procesos, subcontratistas, luego equipo fijo.',
    tiempo: '12–48 meses',
    alimenta: 'Los clientes de la Vía Rápida se vuelven retainers; el margen paga a colaboradores.',
    genera: 'Ingreso que escala con personas y procesos, no con tus horas.',
    hitos: ['3 clientes con mensualidad', 'Procesos escritos de cada servicio', 'Primer subcontratista por proyecto', 'Margen por cliente medido', 'RFC y facturación en orden', 'Primer colaborador recurrente'],
  },
  {
    id: 'inversiones', nombre: 'Inversiones', color: '#f59e0b',
    que: 'Patrimonio que crece con interés compuesto: primero conservador, después diversificado.',
    tiempo: 'Toda la vida',
    alimenta: 'Una parte del fondo de Vía Larga y del ahorro, solo después del fondo de emergencia.',
    genera: 'Libertad: ingresos que no dependen de que trabajes.',
    hitos: ['Fondo de emergencia de $5,000', 'Primera inversión de bajo riesgo (ej. CETES)', 'Aportación automática mensual', 'Fondo de emergencia de 3 meses', '$50,000 invertidos', 'Portafolio diversificado con asesoría'],
  },
]

export interface EtapaLKMR {
  id: string
  nombre: string
  rango: string
  equipo: string
  hacer: string[]
  aprender: string[]
  delegar: string[]
  senal: string
}

export const EVOLUCION_LKMR: EtapaLKMR[] = [
  {
    id: 'freelancer', nombre: 'Freelancer', rango: '$0–$15k/mes', equipo: 'Solo tú + IA',
    hacer: ['1–2 servicios estrella', 'Prospección diaria', 'Sitio LKM\'r publicado', 'Portafolio con casos reales'],
    aprender: ['Ventas y guiones', 'Tu habilidad técnica principal', 'Uso avanzado de IA'],
    delegar: ['Nada todavía: aprende cada parte del proceso'],
    senal: 'Rechazas trabajo porque no te alcanza el tiempo (después de subir precios).',
  },
  {
    id: 'estudio', nombre: 'Estudio de 2–3 personas', rango: '$15k–$40k/mes', equipo: 'Tú + 1–2 colaboradores por proyecto',
    hacer: ['Procesos escritos en Notion', 'Paquetes con precio fijo', 'Contratos simples', 'RFC y facturación'],
    aprender: ['Gestión de proyectos', 'Dar feedback', 'Finanzas por cliente'],
    delegar: ['Edición de video', 'Maquetación', 'Diseño de posts'],
    senal: 'Más del 50% de la producción la hacen otros con calidad que apruebas.',
  },
  {
    id: 'agencia', nombre: 'Agencia con procesos', rango: '$40k–$150k/mes', equipo: 'Equipo base + subcontratistas',
    hacer: ['Retainers mensuales', 'Nicho claro (ej. salud o industria)', 'Líder de producción', 'Métricas semanales'],
    aprender: ['Liderazgo', 'Contratación', 'Ventas B2B', 'Obligaciones patronales (con contador)'],
    delegar: ['Producción completa', 'Atención diaria a clientes', 'Reportes'],
    senal: 'La agencia funciona 2 semanas sin ti y nadie se entera.',
  },
  {
    id: 'productos', nombre: 'Productos propios / SaaS', rango: 'Variable', equipo: 'Agencia + equipo de producto',
    hacer: ['Laboratorio de productos activo', 'Convertir procesos repetidos en software', 'Primeros clientes de la agencia como usuarios'],
    aprender: ['Producto', 'Métricas SaaS (MRR, churn)', 'Marketing de producto'],
    delegar: ['Operación de la agencia a un director'],
    senal: 'Los productos generan un porcentaje relevante del ingreso con menos horas.',
  },
  {
    id: 'holding', nombre: 'Holding con inversiones', rango: 'Patrimonio', equipo: 'Directores + asesores',
    hacer: ['Asignar capital entre negocios', 'Participaciones en negocios locales (con asesoría)', 'Portafolio diversificado'],
    aprender: ['Asignación de capital', 'Lectura de estados financieros', 'Estructura legal y fiscal (con profesionales)'],
    delegar: ['Operación diaria de todos los negocios'],
    senal: 'Tu trabajo principal es decidir dónde poner capital y personas.',
  },
]

export const VALIDACION_PRODUCTO = [
  { id: 'v1', texto: 'Lo vendí 3+ veces como servicio' },
  { id: 'v2', texto: 'Puedo describir el problema en una frase' },
  { id: 'v3', texto: '5 personas del público dijeron que lo pagarían (con precio)' },
  { id: 'v4', texto: 'Al menos 1 pre-venta pagada' },
  { id: 'v5', texto: 'Sé dónde están los compradores y cómo llegarles' },
  { id: 'v6', texto: 'La versión mínima se construye en 2 semanas o menos' },
  { id: 'v7', texto: 'Definí la métrica de éxito (ej. 10 ventas en 30 días)' },
  { id: 'v8', texto: 'No compite de frente con algo gratis y mejor' },
]

export const FORMATOS_PRODUCTO = ['Plantilla (Sheets/Notion/Canva)', 'Kit / paquete de recursos', 'Curso grabado', 'Software / micro-SaaS', 'Servicio productizado (precio fijo)', 'Comunidad / membresía']
