import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copiarTexto, cn } from '../lib/utils'

export function Copiar({ texto, label = 'Copiar', className }: { texto: string; label?: string; className?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await copiarTexto(texto)
        setOk(true)
        setTimeout(() => setOk(false), 1500)
      }}
      className={cn('btn-ghost px-3 py-1.5 text-xs', className)}
    >
      {ok ? <Check className="h-3.5 w-3.5 text-money-400" /> : <Copy className="h-3.5 w-3.5" />}
      {ok ? 'Copiado' : label}
    </button>
  )
}
