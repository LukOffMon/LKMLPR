// ───────── Contenido estático ─────────

export type CategoriaId =
  | 'local'
  | 'freelance'
  | 'tech'
  | 'comercio'
  | 'tecnico'
  | 'educacion'
  | 'contenido'
  | 'escala'

export type Modalidad = 'online' | 'local' | 'mixto'

export type Rango = [number, number]

export interface Recurso {
  nombre: string
  url?: string
  nota?: string
}

export interface Plantillas {
  whatsapp: string
  instagram: string
  correo: string
  persona: string
}

export interface Idea {
  id: string
  nombre: string
  categoria: CategoriaId
  modalidad: Modalidad
  resumen: string
  descripcion: string
  cliente: string
  capital: Rango
  capitalNota?: string
  diasPrimerPeso: Rango
  habilidades: string[]
  aprender: Recurso[]
  ingresos: { arranque: Rango; solido: Rango; escalado: Rango }
  dificultad: number
  riesgo: number
  escalabilidad: number
  ia: string[]
  precio: { arranque: string; subir: string }
  pasos: string[]
  plantillas: Plantillas
  escalar: string[]
  errores: string[]
  /** Etiquetas para el diagnóstico (coincidencia con perfil). */
  tags: string[]
  /** Nivel mínimo de escalera recomendado (1 = desde ya). */
  nivelMin?: number
}

export interface Categoria {
  id: CategoriaId
  nombre: string
  corto: string
  descripcion: string
  color: string
}

export interface ProtocoloItem {
  id: string
  texto: string
  detalle?: string
}

export interface ProtocoloBloque {
  titulo: string
  items: ProtocoloItem[]
}

export interface Protocolo {
  id: string
  nombre: string
  objetivo: string
  duracion: string
  intro: string
  bloques: ProtocoloBloque[]
  notas?: string[]
}

export interface NivelEscalera {
  nivel: number
  nombre: string
  meta: string
  umbral: number // ingreso mensual MXN para considerarlo alcanzado
  enfoque: string
  queCambia: string[]
  hacer: string[]
  desbloquea: string[]
  formalizacion: string
  peligro: string
}

export interface RutaHabilidad {
  id: string
  nombre: string
  porQue: string
  orden: { paso: string; recursos: Recurso[] }[]
  practica: string
}

export interface Trampa {
  id: string
  nombre: string
  gancho: string
  comoFunciona: string
  senales: string[]
  enSuLugar: string
}

// ───────── Estado del usuario ─────────

export interface Diagnostico {
  habilidades: string[]
  intereses: string[]
  horasSemana: number
  horasFinde: number
  ventas: number // 1–5 tolerancia a vender/hablar con gente
  ingles: 'basico' | 'intermedio' | 'avanzado'
  transporte: 'ninguno' | 'publico' | 'bici' | 'moto_auto'
  contactos: string[]
  completado: string // ISO
}

export interface Movimiento {
  id: string
  tipo: 'ingreso' | 'gasto'
  monto: number
  concepto: string
  categoria: string
  fecha: string // YYYY-MM-DD
  /** Vía que generó el ingreso. Por defecto, rápida. */
  via?: Via
}

export interface MetaAhorro {
  id: string
  nombre: string
  objetivo: number
  actual: number
  creada: string
}

export type EstadoLead = 'contactado' | 'interesado' | 'cotizado' | 'cerrado' | 'recurrente' | 'perdido'

export interface Lead {
  id: string
  nombre: string
  negocio: string
  contacto: string
  canal: string
  servicio: string
  estado: EstadoLead
  valor: number
  seguimiento: string // YYYY-MM-DD o ''
  notas: string
  creado: string
  actualizado: string
}

export interface EntradaDiario {
  id: string
  semana: string // YYYY-MM-DD (lunes)
  funciono: string
  noFunciono: string
  ingresos: number
  mensajes: number
  respuestas: number
  ventas: number
  horas: number
  aprendizaje: string
  plan: string
  energia: number // 1–5
  creada: string
}

export interface Tarea {
  id: string
  texto: string
  hecho: boolean
}

export type Via = 'rapida' | 'larga'

/** Movimiento del fondo de Vía Larga: + apartado automático / − usado en un activo. */
export interface AporteLargo {
  id: string
  fecha: string
  monto: number
  concepto: string
  activo?: string
  origen?: string // id del movimiento que lo generó
}

export type TipoSprint = '72h' | '7d' | '30d'
export interface Sprint {
  id: string
  tipo: TipoSprint
  meta: number
  inicio: number // timestamp ms
  checks: Record<string, boolean>
  oferta?: string
  cerrado?: boolean
}

export interface Actividad {
  mensajes: number
  respuestas: number
  llamadas: number
  cotizaciones: number
  cierres: number
}

export interface OfertaGuardada {
  id: string
  cliente: string
  resultado: string
  plazo: string
  bonus: string
  garantia: string
  precio: number
  ancla: string
  urgencia: string
  creada: string
}

export type NivelPlan = 'vision' | '5a' | 'anual' | 'trimestre' | 'mes' | 'semana'
export interface KR {
  id: string
  texto: string
  actual: number
  meta: number
}
export interface PlanItem {
  id: string
  nivel: NivelPlan
  titulo: string
  padreId?: string
  periodo: string
  progreso: number
  krs?: KR[]
}

export interface IceItem {
  id: string
  nombre: string
  i: number
  c: number
  f: number
  nota?: string
}

export type TipoBloque = 'escuela' | 'profundo' | 'prospeccion' | 'entrega' | 'aprendizaje' | 'ejercicio' | 'descanso' | 'vialarga'

export interface ItemRitual {
  t: string
  h: boolean
}
export interface Ritual {
  dinero: ItemRitual[]
  larga: ItemRitual
  aprender: ItemRitual
}

export interface RevisionMes {
  id: string
  mes: string // YYYY-MM
  funciono: string
  noFunciono: string
  ajustes: string
  metaSiguiente: number
  creada: string
}

export type EstadoProducto = 'idea' | 'validando' | 'construyendo' | 'lanzado' | 'descartado'
export interface ProductoLab {
  id: string
  nombre: string
  servicioOrigen: string
  problema: string
  formato: string
  precio: number
  validacion: Record<string, boolean>
  estado: EstadoProducto
  notas: string
}

export interface ConceptoCot {
  id: string
  desc: string
  cant: number
  precio: number
}
export interface Cotizacion {
  id: string
  folio: string
  fecha: string
  cliente: string
  negocio: string
  contacto: string
  conceptos: ConceptoCot[]
  anticipoPct: number
  vigencia: number
  entrega: string
  notas: string
  iva: boolean
  estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada'
}

export interface SesionFoco {
  id: string
  fecha: string
  minutos: number
  tarea: string
}

export interface FocoActivo {
  fin: number
  minutos: number
  tarea: string
  tipo: 'foco' | 'descanso'
  pausadoRestante?: number
}

export interface ConfigDobleVia {
  pctReinversion: number
  pctTiempoRapida: number
  metaMes: number
}

export interface EstadoApp {
  version: 1
  nombre: string
  diagnostico: Diagnostico | null
  rutaElegida: string | null // id de idea
  favoritos: string[]
  checks: Record<string, boolean> // `${protocoloId}:${itemId}`
  movimientos: Movimiento[]
  metas: MetaAhorro[]
  leads: Lead[]
  diario: EntradaDiario[]
  tareas: Record<string, Tarea[]> // por fecha YYYY-MM-DD
  diasActivos: string[] // YYYY-MM-DD
  ideasNotas: Record<string, string>
  // ── v2: Doble vía ──
  config: ConfigDobleVia
  fondoLargo: AporteLargo[]
  sprints: Sprint[]
  actividad: Record<string, Actividad>
  ofertas: OfertaGuardada[]
  plan: PlanItem[]
  ice: IceItem[]
  semana: Record<string, TipoBloque>
  rituales: Record<string, Ritual>
  revisionesMes: RevisionMes[]
  productos: ProductoLab[]
  cotizaciones: Cotizacion[]
  sesionesFoco: SesionFoco[]
  focoActivo: FocoActivo | null
  logrosVistos: string[]
  logrosManuales: string[]
}
