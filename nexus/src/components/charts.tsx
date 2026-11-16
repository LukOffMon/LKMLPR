import { motion } from 'framer-motion';
import { DOMAINS } from '../core/domains';
import type { Domain } from '../core/types';

export function Radar({ values, size = 300, compare }: { values: Record<Domain, number | null>; size?: number; compare?: Partial<Record<Domain, number>> }) {
  const n = DOMAINS.length;
  const c = size / 2;
  const R = size / 2 - 46;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)];
  };
  const poly = DOMAINS.map((d, i) => pt(i, values[d.id] ?? 0).join(',')).join(' ');
  const cmp = compare ? DOMAINS.map((d, i) => pt(i, compare[d.id] ?? 0).join(',')).join(' ') : null;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-full" role="img" aria-label="Gráfico radar del perfil cognitivo">
      <defs>
        <radialGradient id="rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity=".45" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity=".15" />
        </radialGradient>
      </defs>
      {[20, 40, 60, 80, 100].map((r) => (
        <polygon key={r} points={DOMAINS.map((_, i) => pt(i, r).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,.07)" />
      ))}
      {DOMAINS.map((d, i) => {
        const [x, y] = pt(i, 100);
        const [lx, ly] = pt(i, 122);
        const v = values[d.id];
        return (
          <g key={d.id}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,.07)" />
            <text x={lx} y={ly - 5} textAnchor="middle" fontSize="10.5" fontWeight={600} fill={d.color} style={{ letterSpacing: '.08em' }}>
              {d.short}
            </text>
            <text x={lx} y={ly + 8} textAnchor="middle" fontSize="10" fill="#9aa3c0" className="tabular-nums">
              {v === null ? '—' : v}
            </text>
          </g>
        );
      })}
      {cmp && <polygon points={cmp} fill="none" stroke="rgba(255,255,255,.35)" strokeDasharray="3 3" />}
      <motion.polygon points={poly} fill="url(#rg)" stroke="#c4b5fd" strokeWidth={1.6} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: 'center' }} transition={{ duration: 0.8 }} />
      {DOMAINS.map((d, i) => {
        const [x, y] = pt(i, values[d.id] ?? 0);
        return <circle key={d.id} cx={x} cy={y} r={3.2} fill={d.color} />;
      })}
    </svg>
  );
}

/** Línea de progreso con área, rejilla tenue y punto final destacado. */
export function LineChart({ data, color = '#a78bfa', height = 140, yMax, yMin = 0, unit = '' }: { data: { x: number; y: number }[]; color?: string; height?: number; yMax?: number; yMin?: number; unit?: string }) {
  const W = 600;
  const H = height;
  const pad = { l: 34, r: 10, t: 10, b: 20 };
  if (data.length === 0) return <div className="flex h-24 items-center justify-center text-sm text-ink-400">Sin datos todavía</div>;
  const ys = data.map((d) => d.y);
  const max = yMax ?? Math.max(...ys) * 1.1 + 0.001;
  const min = Math.min(yMin, ...ys);
  const sx = (i: number) => pad.l + (data.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const sy = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${sx(i)},${sy(d.y)}`).join(' ');
  const area = `${line} L${sx(data.length - 1)},${H - pad.b} L${sx(0)},${H - pad.b} Z`;
  const ticks = [min, (min + max) / 2, max];
  const gid = `g${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Evolución">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,.06)" />
          <text x={pad.l - 6} y={sy(t) + 3} fontSize="10" textAnchor="end" fill="#6b7595">
            {Math.round(t)}
            {unit}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <circle cx={sx(data.length - 1)} cy={sy(data[data.length - 1].y)} r={4} fill={color} stroke="#05070d" strokeWidth={2} />
    </svg>
  );
}

export function Bars({ data, color = '#a78bfa', height = 110 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="relative flex w-full flex-1 items-end">
            <motion.div
              className="w-full rounded-md"
              style={{ background: d.value ? color : 'rgba(255,255,255,.06)', boxShadow: d.value ? `0 0 14px ${color}55` : undefined }}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
              transition={{ delay: i * 0.04 }}
              title={`${d.value} min`}
            />
          </div>
          <div className="text-[10px] font-semibold text-ink-400">{d.label}</div>
        </div>
      ))}
    </div>
  );
}
