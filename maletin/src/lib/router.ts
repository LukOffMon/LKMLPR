import { useEffect, useState } from 'react'

/** Router mínimo por hash: #/ruta/param. Funciona en cualquier hosting estático y con el botón atrás del celular. */
export const leerRuta = () => {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [path, query] = h.split('?')
  const partes = path.split('/').filter(Boolean)
  return { seccion: partes[0] || 'panel', param: partes[1] ? decodeURIComponent(partes[1]) : undefined, query: new URLSearchParams(query || '') }
}

export const ir = (ruta: string) => {
  window.location.hash = ruta.startsWith('/') ? ruta : `/${ruta}`
}

export function useRuta() {
  const [r, setR] = useState(leerRuta)
  useEffect(() => {
    const on = () => {
      setR(leerRuta())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}
