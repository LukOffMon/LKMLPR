// Utilidades compartidas: respuestas HTTP, criptografía y validación.

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlString(str: string): string {
  return b64url(enc.encode(str));
}

export function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 24): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === "string" ? enc.encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha1Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", data as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PBKDF2_ITERATIONS = 100_000;

async function pbkdf2(secret: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(secret, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifySecret(secret: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, iter, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const salt = b64decode(saltB64.replace(/-/g, "+").replace(/_/g, "/"));
  const hash = b64url(await pbkdf2(secret, salt, Number(iter)));
  if (hash.length !== hashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return diff === 0;
}

export function str(v: unknown, field: string, { min = 1, max = 200 } = {}): string {
  if (typeof v !== "string") throw new HttpError(400, `Falta el campo "${field}".`);
  const s = v.trim();
  if (s.length < min) throw new HttpError(400, `El campo "${field}" es demasiado corto.`);
  if (s.length > max) throw new HttpError(400, `El campo "${field}" es demasiado largo.`);
  return s;
}

export function optStr(v: unknown, field: string, max = 200): string | null {
  if (v === undefined || v === null || v === "") return null;
  return str(v, field, { min: 1, max });
}

export function int(v: unknown, field: string, min: number, max: number): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `"${field}" debe ser un número entre ${min} y ${max}.`);
  }
  return n;
}

export function hexColor(v: unknown, field: string): string {
  if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) throw new HttpError(400, `"${field}" debe ser un color #RRGGBB.`);
  return v.toLowerCase();
}

export function pngDataUrl(v: unknown, field: string, maxBytes: number): string | null {
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !v.startsWith("data:image/png;base64,")) throw new HttpError(400, `"${field}" debe ser una imagen PNG.`);
  if (v.length * 0.75 > maxBytes) throw new HttpError(400, `"${field}" pesa demasiado.`);
  return v;
}

export function normalizePhone(v: unknown): string {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new HttpError(400, "Escribe un teléfono válido (10 dígitos o más).");
  return digits;
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "negocio";
}

export function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
