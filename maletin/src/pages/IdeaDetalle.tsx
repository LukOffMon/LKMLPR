import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Bot, Check, ClipboardList, Copy, ExternalLink, GraduationCap, Layers, ListChecks, Lock, MessageSquare, Star, Tag, Target } from 'lucide-react'
import { useStore } from '../store/store'
import { Aviso, Badge, Card, Dots, Segmented } from '../components/ui'
import { ideaPorId } from '../data/ideas'
import { categoriaPorId } from '../data/categorias'
import type { Plantillas } from '../types'
import { cn, hoyISO, rango, uid } from '../lib/utils'

export function IdeaDetalle({ id }: { id: string }) {
  const { estado, actualizar } = useStore()
  const idea = ideaPorId[id]
  const [canal, setCanal] = useState<keyof Plantillas>('whatsapp')
  const [copiado, setCopiado] = useState(false)
  const [pasosAgregados, setPasosAgregados] = useState(false)

  if (!idea) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-300">No encontré esa idea.</p>
        <a href="#/ideas" className="btn-ghost mt-4">Volver al catálogo</a>
      </div>
    )
  }

  const c = categoriaPorId[idea.categoria]
  const fav = estado.favoritos.includes(idea.id)
  const mia = estado.rutaElegida === idea.id
  const bloqueada = (idea.nivelMin ?? 1) > 1

  const toggleFav = () =>
    actualizar((s) => ({ ...s, favoritos: fav ? s.favoritos.filter((x) => x !== idea.id) : [...s.favoritos, idea.id] }))
  const elegir = () =>
    actualizar((s) => ({ ...s, rutaElegida: mia ? null : idea.id, checks: mia ? s.checks : { ...s.checks, 'dia0-7:d0-elige': true } }))

  const agregarPasos = () => {
    const hoy = hoyISO()
    actualizar((s) => ({
      ...s,
      tareas: { ...s.tareas, [hoy]: [...(s.tareas[hoy] ?? []), ...idea.pasos.map((p, i) => ({ id: uid(), texto: `${idea.nombre.split(' (')[0]} · Paso ${i + 1}: ${p}`, hecho: false }))] },
      checks: { ...s.checks, 'dia0-7:d0-lee': true },
    }))
    setPasosAgregados(true)
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(idea.plantillas[canal])
    } catch {
      const ta = document.createElement('textarea')
      ta.value = idea.plantillas[canal]
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1600)
  }

  return (
    <div className="space-y-5">
      <a href="#/ideas" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-gold-300">
        <ArrowLeft className="h-4 w-4" /> Catálogo
      </a>

      {/* Encabezado tipo expediente */}
      <div className="card-gold relative overflow-hidden p-5 sm:p-7">
        <div className="absolute right-0 top-0 h-full w-1.5" style={{ background: c.color }} />
        <div className="label mb-2" style={{ color: c.color }}>Expediente · {c.nombre}</div>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{idea.nombre}</h1>
        <p className="mt-3 max-w-3xl text-ink-200">{idea.descripcion}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {bloqueada && <Badge><Lock className="h-3 w-3" /> Recomendado desde Nivel {idea.nivelMin}</Badge>}
          <Badge tone="gold">{idea.modalidad === 'mixto' ? 'En línea + local' : idea.modalidad === 'online' ? 'En línea' : 'Local (Jesús María / Ags)'}</Badge>
          {mia && <Badge tone="money"><Check className="h-3 w-3" /> Mi ruta</Badge>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={elegir} className={mia ? 'btn border border-money-500/50 bg-money-500/10 text-money-300' : 'btn-gold'}>
            <Target className="h-4 w-4" /> {mia ? 'Es mi ruta (quitar)' : 'Elegir como mi ruta'}
          </button>
          <button onClick={toggleFav} className="btn-ghost">
            <Star className={cn('h-4 w-4', fav && 'fill-gold-500 text-gold-500')} /> {fav ? 'En favoritas' : 'Favorita'}
          </button>
          <button onClick={agregarPasos} disabled={pasosAgregados} className="btn-ghost">
            <ListChecks className="h-4 w-4" /> {pasosAgregados ? 'Pasos agregados a hoy' : 'Agregar pasos a mis tareas'}
          </button>
        </div>
      </div>

      {/* Números */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="label mb-3">Arranque</div>
          <dl className="space-y-2 text-sm">
            <Fila k="Capital inicial" v={idea.capital[1] === 0 ? '$0' : rango(idea.capital)} />
            <Fila k="Primer peso" v={`${idea.diasPrimerPeso[0]}–${idea.diasPrimerPeso[1]} días`} />
          </dl>
          {idea.capitalNota && <p className="mt-3 text-xs text-ink-400">{idea.capitalNota}</p>}
        </Card>
        <Card>
          <div className="label mb-3">Calificación</div>
          <div className="space-y-2.5">
            <Dots label="Dificultad" value={idea.dificultad} />
            <Dots label="Riesgo" value={idea.riesgo} />
            <Dots label="Escalabilidad" value={idea.escalabilidad} />
          </div>
        </Card>
        <Card>
          <div className="label mb-3">Ingreso estimado / mes</div>
          <dl className="space-y-2 text-sm">
            <Fila k="Arranque" v={rango(idea.ingresos.arranque)} money />
            <Fila k="Sólido" v={rango(idea.ingresos.solido)} money />
            <Fila k="Escalado" v={rango(idea.ingresos.escalado)} money />
          </dl>
          <p className="mt-3 text-[11px] text-ink-500">Estimaciones conservadoras en MXN. No son promesa.</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque icon={<Target />} titulo="A quién se le vende">
          <p className="text-sm text-ink-200">{idea.cliente}</p>
        </Bloque>
        <Bloque icon={<Tag />} titulo="Precio sugerido">
          <p className="text-sm text-ink-200"><span className="font-semibold text-gold-300">Arranque: </span>{idea.precio.arranque}</p>
          <p className="mt-2 text-sm text-ink-200"><span className="font-semibold text-gold-300">Cómo subirlo: </span>{idea.precio.subir}</p>
        </Bloque>
      </div>

      <Bloque icon={<ClipboardList />} titulo="Primeros 10 pasos exactos">
        <ol className="space-y-2.5">
          {idea.pasos.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gold-500/15 font-mono text-xs text-gold-300">{i + 1}</span>
              <span className="pt-0.5 text-ink-200">{p}</span>
            </li>
          ))}
        </ol>
      </Bloque>

      <Bloque icon={<MessageSquare />} titulo="Plantillas de prospección">
        <Segmented
          value={canal}
          onChange={setCanal}
          options={[
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'instagram', label: 'Instagram' },
            { id: 'correo', label: 'Correo' },
            { id: 'persona', label: 'En persona' },
          ]}
          className="mb-3"
        />
        <motion.pre key={canal} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre-wrap rounded-xl border border-ink-700 bg-ink-950/70 p-4 font-sans text-sm leading-relaxed text-ink-200">
          {idea.plantillas[canal]}
        </motion.pre>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-500">Cambia todo lo que está entre [corchetes]. Un mensaje personalizado responde 3–5 veces más.</p>
          <button onClick={copiar} className="btn-ghost">
            {copiado ? <Check className="h-4 w-4 text-money-400" /> : <Copy className="h-4 w-4" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </Bloque>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque icon={<Bot />} titulo="Cómo usar IA para ganarle a la competencia">
          <Lista items={idea.ia} />
        </Bloque>
        <Bloque icon={<GraduationCap />} titulo="Habilidades y cómo aprenderlas gratis">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {idea.habilidades.map((h) => <Badge key={h}>{h}</Badge>)}
          </div>
          <ul className="space-y-2">
            {idea.aprender.map((r) => (
              <li key={r.nombre} className="text-sm">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-gold-300 hover:underline">
                    {r.nombre} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="font-medium text-ink-100">{r.nombre}</span>
                )}
                {r.nota && <span className="block text-xs text-ink-400">{r.nota}</span>}
              </li>
            ))}
          </ul>
        </Bloque>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque icon={<Layers />} titulo='De "yo solo" a negocio'>
          <Lista items={idea.escalar} />
        </Bloque>
        <Bloque icon={<AlertTriangle />} titulo="Errores comunes" alerta>
          <Lista items={idea.errores} alerta />
        </Bloque>
      </div>

      <Bloque icon={<ClipboardList />} titulo="Mis notas sobre esta idea">
        <textarea
          className="input min-h-28"
          placeholder="Prospectos, precios que te dieron, ideas…"
          value={estado.ideasNotas[idea.id] ?? ''}
          onChange={(e) => actualizar((s) => ({ ...s, ideasNotas: { ...s.ideasNotas, [idea.id]: e.target.value } }))}
        />
      </Bloque>

      <Aviso>Las plataformas, comisiones, requisitos y precios cambian. Verifica la información vigente en los sitios oficiales antes de decidir. Nada de esta ficha es garantía de ingresos.</Aviso>
    </div>
  )
}

function Fila({ k, v, money }: { k: string; v: string; money?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-400">{k}</dt>
      <dd className={cn('font-mono font-medium', money ? 'text-money-400' : 'text-ink-100')}>{v}</dd>
    </div>
  )
}

function Bloque({ icon, titulo, children, alerta }: { icon: ReactNode; titulo: string; children: ReactNode; alerta?: boolean }) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <span className={cn('[&>svg]:h-4 [&>svg]:w-4', alerta ? 'text-alert-400' : 'text-gold-500')}>{icon}</span>
        {titulo}
      </h2>
      {children}
    </Card>
  )
}

function Lista({ items, alerta }: { items: string[]; alerta?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((x) => (
        <li key={x} className="flex gap-2.5 text-sm text-ink-200">
          <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', alerta ? 'bg-alert-400' : 'bg-gold-500')} />
          {x}
        </li>
      ))}
    </ul>
  )
}
