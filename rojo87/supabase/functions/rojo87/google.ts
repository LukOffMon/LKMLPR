// Google Wallet: enlace "Guardar en Google Wallet", actualización de sellos y mensajes con notificación.
//
// Secretos de la Edge Function:
//   GOOGLE_ISSUER_ID            Issuer ID de Google Pay & Wallet Console
//   GOOGLE_SA_EMAIL             correo de la cuenta de servicio
//   GOOGLE_SA_PRIVATE_KEY       llave privada PEM de la cuenta de servicio (campo private_key del JSON)
import { b64decode, b64url, b64urlString, firstName } from "./util.ts";
import type { Customer, Merchant } from "./types.ts";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";

export function googleConfig() {
  const issuerId = Deno.env.get("GOOGLE_ISSUER_ID") ?? "";
  const email = Deno.env.get("GOOGLE_SA_EMAIL") ?? "";
  const key = (Deno.env.get("GOOGLE_SA_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");
  return { issuerId, email, key, enabled: Boolean(issuerId && email && key) };
}

let cryptoKey: CryptoKey | null = null;
async function signingKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;
  const pem = googleConfig().key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    b64decode(pem) as BufferSource,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return cryptoKey;
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const head = b64urlString(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64urlString(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await signingKey(), new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(new Uint8Array(sig))}`;
}

let token: { value: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt({
    iss: googleConfig().email,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Google OAuth ${res.status}: ${await res.text()}`);
  const data = await res.json();
  token = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return token.value;
}

const classId = (m: Merchant) => `${googleConfig().issuerId}.r87_${m.id.replace(/-/g, "")}`;
const objectId = (c: Customer) => `${googleConfig().issuerId}.${c.serial}`;

function loyaltyClass(m: Merchant, logoUrl: string) {
  return {
    id: classId(m),
    issuerName: m.name,
    programName: `Tarjeta ${m.name}`,
    programLogo: { sourceUri: { uri: logoUrl }, contentDescription: { defaultValue: { language: "es", value: m.name } } },
    hexBackgroundColor: m.color_bg,
    reviewStatus: "UNDER_REVIEW",
    countryCode: "MX",
  };
}

function objectFields(m: Merchant, c: Customer) {
  return {
    loyaltyPoints: { label: "Sellos", balance: { string: `${c.stamps} de ${m.stamps_required}` } },
    secondaryLoyaltyPoints: { label: "Premios", balance: { int: c.rewards_available } },
    textModulesData: [
      { id: "reward", header: "Recompensa", body: `Junta ${m.stamps_required} sellos y gana: ${m.reward_text}` },
    ],
  };
}

function loyaltyObject(m: Merchant, c: Customer) {
  return {
    id: objectId(c),
    classId: classId(m),
    state: "ACTIVE",
    accountId: c.serial.slice(0, 8).toUpperCase(),
    accountName: firstName(c.name),
    hexBackgroundColor: m.color_bg,
    barcode: { type: "QR_CODE", value: `R87:${c.serial}`, alternateText: c.serial.slice(0, 8).toUpperCase() },
    ...objectFields(m, c),
  };
}

export async function saveUrl(m: Merchant, c: Customer, logoUrl: string, origin: string | null): Promise<string> {
  const jwt = await signJwt({
    iss: googleConfig().email,
    aud: "google",
    typ: "savetowallet",
    origins: origin ? [origin] : [],
    payload: { loyaltyClasses: [loyaltyClass(m, logoUrl)], loyaltyObjects: [loyaltyObject(m, c)] },
  });
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

async function call(method: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Actualiza los sellos del pase; si el cliente aún no lo guardó (404) no hay nada que hacer.
export async function updateObject(m: Merchant, c: Customer): Promise<void> {
  if (!googleConfig().enabled) return;
  const res = await call("PATCH", `/loyaltyObject/${objectId(c)}`, objectFields(m, c));
  if (!res.ok && res.status !== 404) console.error("Google PATCH", res.status, await res.text());
}

export async function updateClass(m: Merchant, logoUrl: string): Promise<void> {
  if (!googleConfig().enabled) return;
  const res = await call("PATCH", `/loyaltyClass/${classId(m)}`, loyaltyClass(m, logoUrl));
  if (!res.ok && res.status !== 404) console.error("Google PATCH class", res.status, await res.text());
}

// Mensaje con notificación. Google permite como máximo 3 por pase cada 24 horas.
export async function sendMessage(m: Merchant, c: Customer, text: string): Promise<boolean> {
  if (!googleConfig().enabled) return false;
  const res = await call("POST", `/loyaltyObject/${objectId(c)}/addMessage`, {
    message: {
      id: `r87_${Date.now()}`,
      header: m.name,
      body: text,
      messageType: "TEXT_AND_NOTIFY",
    },
  });
  return res.ok;
}
