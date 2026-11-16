import { BookOpen, Coins, Sprout } from 'lucide-react'
import { useStore } from '../store/store'
import type { ItemRitual, Ritual } from '../types'
import { cn, hoyISO } from '../lib/utils'

export const ritualVacio = (): Ritual => ({
  dinero: [{ t: '', h: false }, { t: '', h: false }, { t: '', h: false }],
  larga: { t: '', h: false },
  aprender: { t: '', h: false },
})

export const ritualDe = (r: Record<string, Ritual>, f = hoyISO()) => r[f] ?? ritualVacio()

/** Ritual diario: 3 tareas que mueven dinero hoy + 1 de Vía Larga + 1 de aprendizaje. */
export function RitualHoy() {
  const { estado, actualizar, marcarActivo } = useStore()
  const f = hoyISO()
  const r = ritualDe(estado.rituales, f)
  const set = (nuevo: Ritual) => actualizar((s) => ({ ...s, rituales: { ...s.rituales, [f]: nuevo } }))
  const hechos = [...r.dinero, r.larga, r.aprender].filter((x) => x.t && x.h).length
  const total = [...r.dinero, r.larga, r.aprender].filter((x) => x.t).length

  const Fila = ({ item, onChange, ph, color }: { item: ItemRitual; onChange: (i: ItemRitual) => void; ph: string; color: string }) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={!item.t}
        onClick={() => {
          onChange({ ...item, h: !item.h })
          if (!item.h) marcarActivo()
        }}
        className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md border transition disabled:opacity-30', item.h ? 'border-money-500 bg-money-500 text-ink-950' : 'border-ink-500 hover:border-gold-500')}
        aria-label={item.h ? 'Marcar como pendiente' : 'Marcar como hecha'}
      >
        {item.h && <span className="text-xs font-bold">✓</span>}
      </button>
      <input
        className={cn('input py-2 text-sm', item.h && 'text-ink-500 line-through')}
        style={{ borderLeft: `3px solid ${color}` }}
        value={item.t}
        placeholder={ph}
        onChange={(e) => onChange({ ...item, t: e.target.value })}
      />
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>Ritual de hoy</span>
        <span className="font-mono">{hechos}/{total || 5}</span>
      </div>
      <div className="label flex items-center gap-1.5 text-gold-400"><Coins className="h-3.5 w-3.5" /> 3 tareas que mueven dinero hoy</div>
      {r.dinero.map((d, i) => (
        <Fila key={i} item={d} color="#d4af37" ph={['Ej. 10 mensajes a barberías', 'Ej. Entregar menú QR a la taquería', 'Ej. Seguimiento a 3 cotizaciones'][i]} onChange={(x) => set({ ...r, dinero: r.dinero.map((y, j) => (j === i ? x : y)) })} />
      ))}
      <div className="label flex items-center gap-1.5 pt-1 text-sky-300"><Sprout className="h-3.5 w-3.5" /> 1 tarea de Vía Larga</div>
      <Fila item={r.larga} color="#60a5fa" ph="Ej. Grabar 1 video para mi canal" onChange={(x) => set({ ...r, larga: x })} />
      <div className="label flex items-center gap-1.5 pt-1 text-pink-300"><BookOpen className="h-3.5 w-3.5" /> 1 de aprendizaje</div>
      <Fila item={r.aprender} color="#f472b6" ph="Ej. 45 min de React en The Odin Project" onChange={(x) => set({ ...r, aprender: x })} />
    </div>
  )
}
