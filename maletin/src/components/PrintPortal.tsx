import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/** Renderiza contenido solo para impresión, fuera del árbol de la app (evita transforms y layouts). */
export function PrintPortal({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-only">{children}</div>, document.body)
}
