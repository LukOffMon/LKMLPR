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
}
