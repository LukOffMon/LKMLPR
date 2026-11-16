import { useEffect, useState } from 'react'

/** Hora actual que se actualiza cada `ms` (para contadores). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}
