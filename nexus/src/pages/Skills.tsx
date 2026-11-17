import { motion } from 'framer-motion';
import { Award, Check, Lock, Unlock } from 'lucide-react';
import { useStore } from '../core/store';
import { SKILLS, isAvailable, isUnlocked } from '../core/skills';
import { DOMAIN } from '../core/domains';
import { ACHIEVEMENTS } from '../core/achievements';
import { RANKS, levelFromXp, rankFor } from '../core/progress';
import { Bar, Glass, Pill, SectionTitle, cx } from '../components/ui';

export function Skills() {
  const s = useStore((x) => x);
  const lv = levelFromXp(s.xp);
  const rank = rankFor(lv.level);
  const cols = [...new Set(SKILLS.map((n) => n.col))].sort((a, b) => a - b);
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Progreso</div>
        <h1 className="font-display text-3xl font-semibold">Árbol de habilidades</h1>
        <p className="mt-1 max-w-2xl text-ink-400">Cada técnica se desbloquea con práctica real. Algunas abren nuevas variantes de juego (PAO, tabla de Gorbov, rotación 3D).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cols.map((c) => {
          const nodes = SKILLS.filter((n) => n.col === c).sort((a, b) => a.row - b.row);
          return (
            <div key={c} className="relative flex flex-col gap-3">
              {nodes.map((n, i) => {
                const d = DOMAIN[n.domain];
                const done = isUnlocked(s, n.id);
                const avail = isAvailable(s, n.id);
                const pr = n.progress(s);
                return (
                  <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: c * 0.04 + i * 0.05 }} className="relative">
                    {i > 0 && <div className="absolute -top-3 left-6 h-3 w-px" style={{ background: done ? d.color : 'rgba(255,255,255,.15)' }} />}
                    <Glass className={cx('p-4', !avail && 'opacity-50')}>
                      {done && <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: `inset 0 0 0 1px ${d.color}66, 0 0 30px -14px ${d.color}` }} />}
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: done ? d.color : `${d.color}1a`, color: done ? '#05070d' : d.color }}>
                          {done ? <Check size={16} /> : avail ? <Unlock size={15} /> : <Lock size={15} />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-display text-sm font-semibold">{n.name}</div>
                          <div className="text-xs text-ink-400">{n.desc}</div>
                        </div>
                      </div>
                      {!done && (
                        <div className="mt-3">
                          <Bar value={pr.p} color={d.color} height={4} />
                          <div className="mt-1 text-[11px] text-ink-500">{avail ? pr.label : 'Requiere la habilidad anterior'}</div>
                        </div>
                      )}
                      {n.unlocks && <div className="mt-2"><Pill color={d.color}>{done ? 'Desbloqueado: ' : 'Desbloquea: '}{n.unlocks}</Pill></div>}
                    </Glass>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <Glass className="p-5">
          <SectionTitle eyebrow="Rangos" title={`Eres ${rank.name}`} />
          <div className="space-y-2">
            {RANKS.map((r, i) => (
              <div key={r.name} className={cx('flex items-center justify-between rounded-xl px-3 py-2', i === rank.index ? 'bg-violet-400/15 text-ink-100' : i < rank.index ? 'text-ink-300' : 'text-ink-500')}>
                <span className="font-display font-semibold">{r.name}</span>
                <span className="text-xs">nivel {r.min}+</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-500">Nivel actual {lv.level} · {s.xp} XP. La XP premia la práctica constante y la precisión, no el tiempo de pantalla.</p>
        </Glass>
        <Glass className="p-5">
          <SectionTitle eyebrow="Logros" title={`${Object.keys(s.achievements).length} de ${ACHIEVEMENTS.length}`} />
          <div className="grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const got = !!s.achievements[a.id];
              return (
                <div key={a.id} className={cx('flex items-center gap-3 rounded-xl border px-3 py-2', got ? 'border-amber-300/30 bg-amber-300/[.06]' : 'border-white/[.05] opacity-60')}>
                  <Award size={18} className={got ? 'text-amber-300' : 'text-ink-500'} />
                  <div>
                    <div className="text-sm font-semibold">{a.name}</div>
                    <div className="text-xs text-ink-400">{a.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Glass>
      </div>
    </div>
  );
}
