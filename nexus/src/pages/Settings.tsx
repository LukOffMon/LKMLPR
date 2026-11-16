import { useState } from 'react';
import { Copy, Download, Upload } from 'lucide-react';
import { getState, initialState, mergeState, replaceState, update, useStore } from '../core/store';
import type { AppState, Settings as S } from '../core/types';
import { Button, Glass, SectionTitle, cx, inputCls } from '../components/ui';

function Toggle({ id, label, desc, value, onChange }: { id: string; label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0">
        <div className="text-sm font-medium text-ink-100">{label}</div>
        {desc && <div className="text-xs text-ink-400">{desc}</div>}
      </label>
      <button id={id} role="switch" aria-checked={value} onClick={() => onChange(!value)} className={cx('relative h-6 w-11 shrink-0 rounded-full transition', value ? 'bg-violet-400' : 'bg-white/15')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', value ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

export function Settings() {
  const st = useStore((s) => s.settings);
  const name = useStore((s) => s.profile.name);
  const set = <K extends keyof S>(k: K, v: S[K]) => update((d) => void (d.settings[k] = v));
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const doExport = () => {
    const json = JSON.stringify(getState(), null, 2);
    setExported(json);
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `nexus-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      /* algunos entornos bloquean descargas: queda el texto para copiar */
    }
  };
  const doImport = (text: string) => {
    try {
      const parsed = JSON.parse(text) as Partial<AppState>;
      if (!parsed || typeof parsed !== 'object' || !('sessions' in parsed)) throw new Error('formato');
      replaceState(mergeState(initialState(), parsed));
      setMsg('Datos importados correctamente.');
      setImportText('');
    } catch {
      setMsg('No se pudo importar: el texto no es una copia de seguridad de NEXUS válida.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-ink-400">Ajustes</div>
        <h1 className="font-display text-3xl font-semibold">Preferencias y datos</h1>
      </div>
      <Glass className="p-5">
        <SectionTitle title="Perfil y sesiones" />
        <label className="text-sm text-ink-300" htmlFor="set-name">Nombre</label>
        <input id="set-name" className={cx(inputCls, 'mb-4 mt-1')} value={name} onChange={(e) => update((d) => void (d.profile.name = e.target.value))} />
        <div className="text-sm text-ink-300">Duración de la rutina diaria</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[10, 15, 20, 25].map((m) => (
            <button key={m} onClick={() => set('sessionMinutes', m)} className={cx('h-10 rounded-xl border text-sm font-semibold', st.sessionMinutes === m ? 'border-violet-400 bg-violet-400/15' : 'border-white/10 bg-white/[.03] text-ink-300')}>
              {m} min
            </button>
          ))}
        </div>
      </Glass>
      <Glass className="divide-y divide-white/[.06] px-5 py-2">
        <Toggle id="set-sound" label="Sonido" desc="Efectos sintetizados suaves (Web Audio)." value={st.sound} onChange={(v) => set('sound', v)} />
        <div className="py-3">
          <label htmlFor="set-vol" className="text-sm font-medium text-ink-100">Volumen</label>
          <input id="set-vol" type="range" min={0} max={1} step={0.05} value={st.volume} onChange={(e) => set('volume', Number(e.target.value))} className="mt-2 w-full accent-violet-400" />
        </div>
        <Toggle id="set-voice" label="Voz en Dual N-Back" desc="Letras habladas con síntesis de voz; si se desactiva o no está disponible, se usan notas musicales." value={st.voice} onChange={(v) => set('voice', v)} />
        <Toggle id="set-focus" label="Modo Foco" desc="Oculta la navegación y atenúa el fondo durante los ejercicios." value={st.focusMode} onChange={(v) => set('focusMode', v)} />
        <Toggle id="set-meta" label="Predicciones metacognitivas" desc="Antes de ver el resultado, estima tu precisión para entrenar tu calibración." value={st.metacog} onChange={(v) => set('metacog', v)} />
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <div className="text-sm font-medium text-ink-100">Reducir movimiento</div>
            <div className="text-xs text-ink-400">Desactiva animaciones y la red neuronal en movimiento.</div>
          </div>
          <select id="set-motion" value={st.reduceMotion} onChange={(e) => set('reduceMotion', e.target.value as S['reduceMotion'])} className="h-9 rounded-lg border border-white/10 bg-ink-900 px-2 text-sm">
            <option value="system">Según el sistema</option>
            <option value="on">Activado</option>
            <option value="off">Desactivado</option>
          </select>
        </div>
      </Glass>
      <Glass className="p-5">
        <SectionTitle title="Copia de seguridad" />
        <p className="mb-3 text-sm text-ink-400">Tus datos se guardan solo en este navegador. Exporta una copia en JSON para no perderlos o para pasarlos a otro dispositivo.</p>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download size={16} />} onClick={doExport}>Exportar JSON</Button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.06] px-4 text-sm font-medium hover:bg-white/10">
            <Upload size={16} /> Importar archivo
            <input id="set-import-file" type="file" accept="application/json,.json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) doImport(await f.text()); }} />
          </label>
        </div>
        {exported && (
          <div className="mt-3">
            <textarea id="set-exported" readOnly value={exported} className={cx(inputCls, 'h-28 py-2 font-mono text-xs')} onFocus={(e) => e.currentTarget.select()} />
            <Button className="mt-2" size="sm" icon={<Copy size={14} />} onClick={async () => { try { await navigator.clipboard.writeText(exported); setMsg('Copiado al portapapeles.'); } catch { setMsg('Selecciona el texto y cópialo manualmente.'); } }}>Copiar</Button>
          </div>
        )}
        <div className="mt-4">
          <label htmlFor="set-import" className="text-sm text-ink-300">O pega aquí una copia de seguridad</label>
          <textarea id="set-import" value={importText} onChange={(e) => setImportText(e.target.value)} className={cx(inputCls, 'mt-1 h-20 py-2 font-mono text-xs')} placeholder='{"version":1, …}' />
          <Button className="mt-2" size="sm" disabled={!importText.trim()} onClick={() => doImport(importText)}>Importar texto</Button>
        </div>
        {msg && <p className="mt-3 text-sm text-amber-200">{msg}</p>}
      </Glass>
      <Glass className="p-5">
        <SectionTitle title="Zona de reinicio" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => update((d) => void (d.profile.onboarded = false))}>Repetir evaluación inicial</Button>
          {!confirmReset ? (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>Borrar todos los datos</Button>
          ) : (
            <>
              <Button variant="danger" onClick={() => { replaceState(initialState()); setConfirmReset(false); }}>Sí, borrar definitivamente</Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancelar</Button>
            </>
          )}
        </div>
      </Glass>
      <p className="pb-4 text-center text-xs text-ink-500">NEXUS se basa en técnicas con respaldo científico, pero no es un dispositivo médico. Las mejoras suelen ser específicas de lo que practicas.</p>
    </div>
  );
}
