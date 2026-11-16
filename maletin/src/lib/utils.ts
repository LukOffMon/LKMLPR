export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

export const dinero = (n: number) => mxn.format(Math.round(n || 0))

export const dineroCorto = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(n % 1000 === 0 ? 0 : 1).replace('.0', '')}k`
  return `$${n}`
}

export const rango = (r: [number, number]) =>
  r[0] === r[1] ? dineroCorto(r[0]) : `${dineroCorto(r[0])}–${dineroCorto(r[1])}`

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha local en formato YYYY-MM-DD. */
export const hoyISO = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const sumarDias = (s: string, n: number) => {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return hoyISO(d)
}

export const lunesDe = (d = new Date()) => {
  const x = new Date(d)
  const dia = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dia)
  return hoyISO(x)
}

export const mesClave = (s: string) => s.slice(0, 7)

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const nombreMes = (clave: string) => {
  const [y, m] = clave.split('-').map(Number)
  return `${meses[m - 1]} ${String(y).slice(2)}`
}

export const fechaCorta = (s: string) => {
  if (!s) return ''
  const d = parseISO(s)
  return `${d.getDate()} ${meses[d.getMonth()]}`
}

export const diffDias = (a: string, b: string) =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)

/** Racha de días consecutivos terminando hoy (o ayer, si hoy aún no hay actividad). */
export const calcularRacha = (dias: string[]) => {
  const set = new Set(dias)
  let cursor = hoyISO()
  if (!set.has(cursor)) cursor = sumarDias(cursor, -1)
  let n = 0
  while (set.has(cursor)) {
    n++
    cursor = sumarDias(cursor, -1)
  }
  return n
}

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))

export const copiarTexto = async (t: string) => {
  try {
    await navigator.clipboard.writeText(t)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = t
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

export const duracionTexto = (ms: number) => {
  if (ms <= 0) return '0:00:00'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return d > 0 ? `${d}d ${p(h)}:${p(m)}:${p(ss)}` : `${h}:${p(m)}:${p(ss)}`
}
