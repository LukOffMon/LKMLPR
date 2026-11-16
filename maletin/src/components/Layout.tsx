import { useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Briefcase,
  CalendarRange,
  ClipboardCheck,
  Compass,
  Crown,
  Crosshair,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  NotebookPen,
  Printer,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useStore } from '../store/store'

type ItemMenu = { id: string; label: string; icon: typeof Menu }

export const GRUPOS: { titulo: string; items: ItemMenu[] }[] = [
  {
    titulo: 'Operación',
    items: [
      { id: 'panel', label: 'Panel', icon: LayoutDashboard },
      { id: 'guerra', label: 'Sala de guerra', icon: Crosshair },
      { id: 'plan', label: 'Plan maestro', icon: CalendarRange },
      { id: 'efectivo', label: 'Modo Efectivo', icon: Zap },
      { id: 'imperio', label: 'Modo Imperio', icon: Crown },
    ],
  },
  {
    titulo: 'Negocio',
    items: [
      { id: 'crm', label: 'Clientes', icon: Users },
      { id: 'herramientas', label: 'Herramientas', icon: Wrench },
      { id: 'finanzas', label: 'Finanzas', icon: Wallet },
      { id: 'ideas', label: 'Ideas', icon: Briefcase },
      { id: 'protocolos', label: 'Protocolos', icon: ClipboardCheck },
    ],
  },
  {
    titulo: 'Crecimiento',
    items: [
      { id: 'escalera', label: 'Escalera', icon: TrendingUp },
      { id: 'diario', label: 'Diario', icon: NotebookPen },
      { id: 'biblioteca', label: 'Biblioteca', icon: BookOpen },
      { id: 'trampas', label: 'Trampas', icon: ShieldAlert },
      { id: 'diagnostico', label: 'Diagnóstico', icon: Compass },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { id: 'imprimir', label: 'Plan imprimible', icon: Printer },
      { id: 'ajustes', label: 'Respaldo', icon: Settings },
    ],
  },
]

export const NAV: ItemMenu[] = GRUPOS.flatMap((g) => g.items)

const MOVIL = ['panel', 'guerra', 'efectivo', 'plan'] as const

export function Layout({ seccion, children }: { seccion: string; children: ReactNode }) {
  const [menu, setMenu] = useState(false)
  const { guardadoOk } = useStore()

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barra lateral escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-800 bg-ink-950/80 backdrop-blur lg:flex">
        <Marca />
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <Grupos seccion={seccion} />
        </nav>
        <div className="border-t border-ink-800 px-5 py-4 text-[11px] text-ink-500">
          <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', guardadoOk ? 'bg-money-500' : 'bg-alert-500')} />
          {guardadoOk ? 'Guardado en este dispositivo' : 'No se pudo guardar: exporta un respaldo'}
        </div>
      </aside>

      {/* Barra superior móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-800/80 bg-ink-950/85 px-4 py-3 backdrop-blur lg:hidden">
        <a href="#/panel" className="flex items-center gap-2">
          <LogoMaletin className="h-7 w-7" />
          <span className="font-display text-lg font-semibold tracking-tight">Maletín</span>
        </a>
        <button onClick={() => setMenu(true)} className="rounded-lg p-2 text-ink-200 hover:bg-ink-800" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        <AnimatePresence mode="wait">
          <motion.div key={seccion} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Barra inferior móvil */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-950/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {MOVIL.map((id) => {
            const n = NAV.find((x) => x.id === id)!
            const Icon = n.icon
            const activo = seccion === id
            return (
              <a key={id} href={`#/${id}`} className={cn('flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium', activo ? 'text-gold-400' : 'text-ink-400')}>
                <Icon className="h-5 w-5" />
                {n.label}
              </a>
            )
          })}
          <button onClick={() => setMenu(true)} className={cn('flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium', !MOVIL.includes(seccion as (typeof MOVIL)[number]) ? 'text-gold-400' : 'text-ink-400')}>
            <LayoutGrid className="h-5 w-5" />
            Más
          </button>
        </div>
      </nav>

      {/* Menú móvil */}
      <AnimatePresence>
        {menu && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setMenu(false)} />
            <motion.div
              className="absolute inset-y-0 right-0 flex w-72 flex-col border-l border-ink-700 bg-ink-900"
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <span className="label">Secciones</span>
                <button onClick={() => setMenu(false)} className="rounded-lg p-2 hover:bg-ink-800" aria-label="Cerrar menú">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 pb-6" onClick={() => setMenu(false)}>
                <Grupos seccion={seccion} />
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Grupos({ seccion }: { seccion: string }) {
  return (
    <>
      {GRUPOS.map((g) => (
        <div key={g.titulo} className="mb-3">
          <div className="label px-3 pb-1.5 pt-2 text-[9px] text-ink-500">{g.titulo}</div>
          <div className="space-y-0.5">
            {g.items.map((n) => (
              <ItemNav key={n.id} {...n} activo={seccion === n.id} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function ItemNav({ id, label, icon: Icon, activo }: { id: string; label: string; icon: typeof Menu; activo: boolean }) {
  return (
    <a
      href={`#/${id}`}
      className={cn(
        'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
        activo ? 'bg-gold-500/10 text-gold-300' : 'text-ink-300 hover:bg-ink-800/80 hover:text-ink-100',
      )}
    >
      {activo && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold-500" />}
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </a>
  )
}

function Marca() {
  return (
    <a href="#/panel" className="flex items-center gap-3 border-b border-ink-800 px-5 py-5">
      <LogoMaletin className="h-9 w-9" />
      <div>
        <div className="font-display text-lg font-semibold leading-none tracking-tight">Maletín</div>
        <div className="mt-1 text-[11px] text-ink-400">Centro de operaciones</div>
      </div>
    </a>
  )
}

export function LogoMaletin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#121418" stroke="#2e333c" />
      <rect x="6" y="11" width="20" height="14" rx="2.5" fill="none" stroke="#d4af37" strokeWidth="2" />
      <path d="M12 11V8.5A1.5 1.5 0 0 1 13.5 7h5A1.5 1.5 0 0 1 20 8.5V11" fill="none" stroke="#d4af37" strokeWidth="2" />
      <path d="M6 17h20" stroke="#34d399" strokeWidth="2" />
      <rect x="14.5" y="15.5" width="3" height="3" rx="0.6" fill="#d4af37" />
    </svg>
  )
}
