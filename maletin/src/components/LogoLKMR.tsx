/** Logo tipográfico LKM'r (geométrico, sin depender de fuentes). */
export function LogoLKMR({ className, tinta = '#f2f3f5', acento = '#c8ff2e' }: { className?: string; tinta?: string; acento?: string }) {
  return (
    <svg viewBox="0 0 196 60" className={className} role="img" aria-label="LKM'r">
      <path fill={tinta} d="M2 6h11v38h21v10H2z" />
      <path fill={tinta} d="M40 6h11v19L68 6h14L62 27l21 27H68L55 36l-4 4v14H40z" />
      <path fill={tinta} d="M88 6h12l13 22 13-22h12v48h-11V27l-14 23-14-23v27H88z" />
      <path fill={acento} d="M145 6h11l-6 18h-9z" />
      <path fill={tinta} d="M160 24h10v5c3-4 8-6 14-6h4v10h-5c-8 0-13 4-13 11v10h-10z" />
    </svg>
  )
}
