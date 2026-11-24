// Apple Wallet: genera y firma pases .pkpass, y avisa a los iPhone por APNs cuando un pase cambia.
//
// Secretos de la Edge Function:
//   APPLE_PASS_TYPE_ID   p. ej. pass.com.rojo87.loyalty
//   APPLE_TEAM_ID        Team ID de la cuenta de Apple Developer
//   APPLE_P12_BASE64     certificado del Pass Type ID exportado como .p12, en base64
//   APPLE_P12_PASSWORD   contraseña del .p12 (puede ir vacía)
import forge from "npm:node-forge@1.3.1";
import { zipSync } from "npm:fflate@0.8.2";
import { APPLE_WWDR_G4_PEM, DEFAULT_ICON_PNG_B64 } from "./assets.ts";
import { b64decode, firstName, hexToRgb, sha1Hex } from "./util.ts";
import type { Customer, Merchant } from "./types.ts";

type Signer = { cert: forge.pki.Certificate; key: forge.pki.PrivateKey; certPem: string; keyPem: string };

let cachedSigner: Signer | null | undefined;

export function appleConfig() {
  const passTypeId = Deno.env.get("APPLE_PASS_TYPE_ID") ?? "";
  const teamId = Deno.env.get("APPLE_TEAM_ID") ?? "";
  const p12 = Deno.env.get("APPLE_P12_BASE64") ?? "";
  return { passTypeId, teamId, p12, enabled: Boolean(passTypeId && teamId && p12) };
}

function loadSigner(): Signer | null {
  if (cachedSigner !== undefined) return cachedSigner;
  const cfg = appleConfig();
  if (!cfg.enabled) return (cachedSigner = null);
  const der = forge.util.decode64(cfg.p12.replace(/\s+/g, ""));
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), Deno.env.get("APPLE_P12_PASSWORD") ?? "");
  const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
  const keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
  if (!certBag?.cert || !keyBag?.key) throw new Error("El .p12 no contiene certificado y llave privada.");
  return (cachedSigner = {
    cert: certBag.cert,
    key: keyBag.key,
    certPem: forge.pki.certificateToPem(certBag.cert),
    keyPem: forge.pki.privateKeyToPem(keyBag.key),
  });
}

function signManifest(manifest: string, signer: Signer): Uint8Array {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest, "utf8");
  p7.addCertificate(signer.cert);
  p7.addCertificate(forge.pki.certificateFromPem(APPLE_WWDR_G4_PEM));
  p7.addSigner({
    key: signer.key,
    certificate: signer.cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const out = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) out[i] = der.charCodeAt(i);
  return out;
}

function pngFromDataUrl(dataUrl: string | null): Uint8Array | null {
  if (!dataUrl) return null;
  return b64decode(dataUrl.slice(dataUrl.indexOf(",") + 1));
}

export function isInactive(c: Customer, m: Merchant, now = Date.now()): boolean {
  if (!c.last_visit_at) return false;
  return now - new Date(c.last_visit_at).getTime() > m.inactive_days * 86_400_000;
}

export function buildPassJson(m: Merchant, c: Customer, webServiceURL: string) {
  const cfg = appleConfig();
  const remaining = m.stamps_required - c.stamps;
  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: cfg.passTypeId,
    teamIdentifier: cfg.teamId,
    serialNumber: c.serial,
    authenticationToken: c.auth_token,
    webServiceURL,
    organizationName: m.name,
    description: `Tarjeta de lealtad de ${m.name}`,
    logoText: m.logo_png ? undefined : m.name,
    foregroundColor: hexToRgb(m.color_fg),
    backgroundColor: hexToRgb(m.color_bg),
    labelColor: hexToRgb(m.color_accent),
    storeCard: {
      headerFields: [
        { key: "rewards", label: "PREMIOS", value: c.rewards_available, changeMessage: "🎁 Tienes %@ premio(s) listo(s) para canjear" },
      ],
      primaryFields: [
        { key: "stamps", label: "SELLOS", value: `${c.stamps} de ${m.stamps_required}`, changeMessage: "Ahora llevas %@ sellos" },
      ],
      secondaryFields: [
        { key: "reward", label: "RECOMPENSA", value: m.reward_text },
        { key: "customer", label: "CLIENTE", value: firstName(c.name) },
      ],
      backFields: [
        { key: "promo", label: `Mensaje de ${m.name}`, value: c.last_message ?? "Aquí verás promociones exclusivas.", changeMessage: "%@" },
        { key: "how", label: "Cómo funciona", value: `Muestra este código al pagar y suma un sello por visita. Al juntar ${m.stamps_required} sellos ganas: ${m.reward_text}.` },
        ...(m.address ? [{ key: "address", label: "Dirección", value: m.address }] : []),
        { key: "powered", label: "Tarjeta creada con Rojo 87", value: "¿Tienes un negocio? Crea tu tarjeta de lealtad en Wallet con Rojo 87." },
      ],
    },
    barcodes: [{ format: "PKBarcodeFormatQR", message: `R87:${c.serial}`, messageEncoding: "iso-8859-1", altText: c.serial.slice(0, 8).toUpperCase() }],
  };
  // Recordatorio por cercanía: con la ubicación del local en el pase, el iPhone sugiere la tarjeta
  // en la pantalla de bloqueo cuando el cliente pasa cerca. El negocio elige si va para todos
  // sus clientes o solo para los inactivos.
  const nearby = m.nearby ?? "inactive";
  const inactive = isInactive(c, m);
  if (m.lat != null && m.lng != null && (nearby === "all" || (nearby === "inactive" && inactive))) {
    pass.locations = [{
      latitude: m.lat,
      longitude: m.lng,
      relevantText: remaining <= 1
        ? `${firstName(c.name)}, te falta 1 sello para tu ${m.reward_text}`
        : inactive
          ? `${firstName(c.name)}, te extrañamos en ${m.name}. Llevas ${c.stamps} sellos.`
          : `Estás cerca de ${m.name}. Llevas ${c.stamps} de ${m.stamps_required} sellos.`,
    }];
  }
  return pass;
}

export async function buildPkpass(m: Merchant, c: Customer, webServiceURL: string): Promise<Uint8Array> {
  const signer = loadSigner();
  if (!signer) throw new Error("Apple Wallet no está configurado.");
  const icon = pngFromDataUrl(m.icon_png) ?? b64decode(DEFAULT_ICON_PNG_B64);
  const files: Record<string, Uint8Array> = {
    "pass.json": new TextEncoder().encode(JSON.stringify(buildPassJson(m, c, webServiceURL))),
    "icon.png": icon,
    "icon@2x.png": icon,
  };
  const logo = pngFromDataUrl(m.logo_png);
  if (logo) {
    files["logo.png"] = logo;
    files["logo@2x.png"] = logo;
  }
  const manifest: Record<string, string> = {};
  for (const [name, data] of Object.entries(files)) manifest[name] = await sha1Hex(data);
  const manifestStr = JSON.stringify(manifest);
  files["manifest.json"] = new TextEncoder().encode(manifestStr);
  files["signature"] = signManifest(manifestStr, signer);
  return zipSync(files, { level: 6 });
}

// Notificación vacía por APNs: le dice al iPhone que descargue la versión nueva del pase.
// Los pases usan el certificado del Pass Type ID como certificado de cliente TLS.
export async function pushPassUpdate(pushTokens: string[]): Promise<{ sent: number; error?: string }> {
  const signer = loadSigner();
  const cfg = appleConfig();
  if (!signer || pushTokens.length === 0) return { sent: 0 };
  // deno-lint-ignore no-explicit-any
  const createHttpClient = (Deno as any).createHttpClient;
  if (typeof createHttpClient !== "function") return { sent: 0, error: "Este runtime no permite certificados de cliente (APNs)." };
  const client = createHttpClient({ cert: signer.certPem, key: signer.keyPem, http2: true, http1: false });
  let sent = 0;
  let error: string | undefined;
  try {
    await Promise.all(pushTokens.map(async (token) => {
      try {
        const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
          method: "POST",
          headers: { "apns-topic": cfg.passTypeId, "apns-push-type": "background", "apns-priority": "5" },
          body: "{}",
          // @ts-ignore: opción de Deno
          client,
        });
        if (res.ok) sent++;
        else error = `APNs ${res.status}: ${await res.text()}`;
      } catch (e) {
        error = String(e);
      }
    }));
  } finally {
    client.close?.();
  }
  return { sent, error };
}
