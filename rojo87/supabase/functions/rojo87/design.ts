// Diseño de la tarjeta: opciones permitidas y validación.
// El navegador manda un objeto `design`; aquí se queda solo con valores conocidos.
import { HttpError } from "./util.ts";

const OPTIONS: Record<string, readonly string[]> = {
  icon: ["cubiertos", "copa", "estrella", "tijeras", "taza", "huella", "corazon", "bolsa", "gota", "rayo", "corona", "flor"],
  stamp: ["tinta", "relleno", "contorno"],
  pattern: ["liso", "puntos", "rayas", "cuadricula", "ondas"],
  font: ["moderna", "compacta", "clasica", "maquina"],
  corners: ["redondas", "rectas"],
  page: ["claro", "oscuro", "marca"],
};

export const NEARBY = ["all", "inactive", "off"] as const;

export function sanitizeDesign(v: unknown): Record<string, string> {
  if (v === null || v === undefined) return {};
  if (typeof v !== "object" || Array.isArray(v)) throw new HttpError(400, "Diseño inválido.");
  const src = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(OPTIONS)) {
    const val = src[key];
    if (typeof val === "string" && allowed.includes(val)) out[key] = val;
  }
  if (typeof src.theme === "string" && /^[a-z0-9-]{1,30}$/.test(src.theme)) out.theme = src.theme;
  return out;
}

export function nearbyMode(v: unknown): string {
  if (typeof v !== "string" || !(NEARBY as readonly string[]).includes(v)) {
    throw new HttpError(400, "Opción de recordatorio por cercanía inválida.");
  }
  return v;
}
