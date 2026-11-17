import { useEffect, useRef } from 'react';
import { bus } from '../core/bus';

/** Red de partículas conectadas que reacciona al cursor y se enciende con los aciertos. */
export function NeuralBackground({ reduced, dim }: { reduced: boolean; dim: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dimRef = useRef(dim);
  dimRef.current = dim;

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let w = 0,
      h = 0,
      dpr = 1;
    type P = { x: number; y: number; vx: number; vy: number; e: number; hue: number };
    let ps: P[] = [];
    const mouse = { x: -9999, y: -9999 };
    let glow = 0;
    let fail = 0;
    const hues = [262, 190, 160, 215, 330];

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, (w * h) / 14000));
      ps = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, e: 0, hue: hues[Math.floor(Math.random() * hues.length)] }));
    };
    resize();
    window.addEventListener('resize', resize);
    const mm = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('pointermove', mm);
    const off = bus.on((e) => {
      if (e === 'success' || e === 'burst') {
        glow = e === 'burst' ? 1.6 : 1;
        // encender un grupo de neuronas cerca del centro o aleatorio
        const cx = w / 2 + (Math.random() - 0.5) * w * 0.6;
        const cy = h / 2 + (Math.random() - 0.5) * h * 0.6;
        for (const p of ps) {
          const d = Math.hypot(p.x - cx, p.y - cy);
          if (d < 260) p.e = Math.max(p.e, 1 - d / 260);
        }
      } else fail = 0.6;
    });

    let raf = 0;
    const LINK = 130;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const a = dimRef.current ? 0.45 : 1;
      for (const p of ps) {
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          const dx = p.x - mouse.x,
            dy = p.y - mouse.y;
          const dm = Math.hypot(dx, dy);
          if (dm < 140 && dm > 0) {
            p.x += (dx / dm) * 0.6;
            p.y += (dy / dm) * 0.6;
            p.e = Math.max(p.e, 0.25);
          }
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;
        }
        p.e *= 0.965;
      }
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        for (let j = i + 1; j < ps.length; j++) {
          const q = ps[j];
          const dx = p.x - q.x,
            dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const d = Math.sqrt(d2);
            const e = Math.max(p.e, q.e);
            const al = (1 - d / LINK) * (0.08 + e * 0.5 + glow * 0.08) * a;
            ctx.strokeStyle = e > 0.05 ? `hsla(${p.hue},90%,70%,${al})` : fail > 0.05 ? `rgba(251,113,133,${al * 0.7})` : `rgba(148,163,210,${al})`;
            ctx.lineWidth = 0.6 + e * 1.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      for (const p of ps) {
        const r = 1.2 + p.e * 2.6;
        ctx.fillStyle = `hsla(${p.hue},90%,${65 + p.e * 20}%,${(0.35 + p.e * 0.65) * a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (p.e > 0.2) {
          ctx.fillStyle = `hsla(${p.hue},90%,70%,${p.e * 0.15 * a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      glow *= 0.94;
      fail *= 0.92;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', mm);
      off();
    };
  }, [reduced]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-0" />;
}
