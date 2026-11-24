// Rojo 87: API de fidelización con Apple Wallet y Google Wallet.
// Una sola Edge Function: /api/* para el panel, la app de sellado y la tarjeta del cliente,
// y /apple/v1/* para el servicio web de PassKit que llaman los iPhone.
import postgres from "npm:postgres@3.4.5";
import { appleConfig, buildPkpass, isInactive, pushPassUpdate } from "./apple.ts";
import * as google from "./google.ts";
import { accountState, contactWhatsapp, handleAdmin, isBlocked, PLANS } from "./admin.ts";
import { nearbyMode, sanitizeDesign } from "./design.ts";
import type { Customer, Merchant, Session } from "./types.ts";
import {
  CORS_HEADERS,
  hashSecret,
  hexColor,
  HttpError,
  int,
  json,
  normalizePhone,
  optStr,
  pngDataUrl,
  randomToken,
  sha256Hex,
  slugify,
  str,
  verifySecret,
} from "./util.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3 });
const PUBLIC_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1/rojo87`;
const DAY = 86_400_000;

const MERCHANT_PUBLIC_COLS = sql`id, slug, name, vertical, logo_png, icon_png, color_bg, color_fg, color_accent,
  reward_text, stamps_required, address, lat, lng, design, status, pending_since, paid_until`;
const MERCHANT_COLS = sql`id, slug, name, owner_email, vertical, logo_png, icon_png, color_bg, color_fg, color_accent,
  reward_text, stamps_required, ticket_avg::float8 as ticket_avg, inactive_days, stamp_cooldown_min, lat, lng, address,
  plan, trial_ends_at, created_at, staff_pin_hash is not null as has_staff_pin, status, pending_since, paid_until, approved_at,
  design, nearby`;

// deno-lint-ignore no-explicit-any
const runtime = (globalThis as any).EdgeRuntime;
function background(p: Promise<unknown>) {
  const guarded = p.catch((e) => console.error("background", e));
  if (runtime?.waitUntil) runtime.waitUntil(guarded);
}

// ---------- Sesiones ----------

async function createSession(merchantId: string, role: "owner" | "staff", staffName: string | null) {
  const token = randomToken(32);
  await sql`insert into r87_sessions (token_hash, merchant_id, role, staff_name, expires_at)
    values (${await sha256Hex(token)}, ${merchantId}, ${role}, ${staffName}, now() + interval '30 days')`;
  return token;
}

async function requireSession(req: Request, role?: "owner"): Promise<Session> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new HttpError(401, "Inicia sesión para continuar.");
  const [s] = await sql<Session[]>`select merchant_id, role, staff_name from r87_sessions
    where token_hash = ${await sha256Hex(token)} and expires_at > now()`;
  if (!s) throw new HttpError(401, "Tu sesión expiró. Vuelve a entrar.");
  if (role === "owner" && s.role !== "owner") throw new HttpError(403, "Solo el dueño del negocio puede hacer esto.");
  return s;
}

// Igual que requireSession, pero rechaza negocios con membresía cancelada o vencida.
async function requireActive(req: Request, role?: "owner"): Promise<Session> {
  const s = await requireSession(req, role);
  const [m] = await sql`select status, pending_since, paid_until from r87_merchants where id = ${s.merchant_id}`;
  if (m && isBlocked(m as never)) {
    throw new HttpError(402, accountState(m as never).state === "cancelled"
      ? "La membresía de este negocio está cancelada. Contáctanos para reactivarla."
      : "La membresía de este negocio venció. Renueva tu plan para seguir usando Rojo 87.");
  }
  return s;
}

async function getMerchant(id: string): Promise<Merchant> {
  const [m] = await sql<Merchant[]>`select ${MERCHANT_COLS} from r87_merchants where id = ${id}`;
  if (!m) throw new HttpError(404, "Negocio no encontrado.");
  return m;
}

// ---------- Wallet: propagar cambios a los teléfonos ----------

async function notifyWallets(m: Merchant, customers: Customer[], message?: string) {
  if (customers.length === 0) return;
  const tasks: Promise<unknown>[] = [];
  if (appleConfig().enabled) {
    const regs = await sql<{ push_token: string }[]>`select distinct push_token from r87_apple_registrations
      where serial in ${sql(customers.map((c) => c.serial))}`;
    tasks.push(pushPassUpdate(regs.map((r) => r.push_token)).then((r) => r.error && console.error("APNs", r.error)));
  }
  if (google.googleConfig().enabled) {
    for (const c of customers) {
      tasks.push(message ? google.sendMessage(m, c, message) : google.updateObject(m, c));
    }
  }
  await Promise.allSettled(tasks);
}

const logoUrl = (m: Merchant) => `${PUBLIC_BASE}/api/public/m/${m.slug}/logo.png`;

// El logo propio es parte del plan pagado: subirlo exige una cuenta activa (aprobada en la llave maestra)
// y solo se muestra a los clientes si el negocio ya pagó alguna vez.
const hasPaid = (m: { paid_until: string | null }) => m.paid_until !== null;
function withPaidBranding<T extends { paid_until: string | null; logo_png: string | null; icon_png?: string | null }>(m: T): T {
  return hasPaid(m) ? m : { ...m, logo_png: null, icon_png: null };
}

// Manda la versión nueva del pase de Apple Wallet a todos los clientes del negocio que lo tienen guardado.
async function refreshAllPasses(m: Merchant) {
  const customers = await sql<Customer[]>`update r87_customers c set updated_at = now()
    where c.merchant_id = ${m.id} and exists (select 1 from r87_apple_registrations r where r.serial = c.serial)
    returning c.*`;
  await notifyWallets(m, customers);
}

// ---------- Cuenta del comerciante ----------

async function signup(body: Record<string, unknown>) {
  const name = str(body.name, "nombre del negocio", { min: 2, max: 60 });
  const email = str(body.email, "correo", { max: 120 }).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Escribe un correo válido.");
  const password = str(body.password, "contraseña", { min: 8, max: 128 });
  const vertical = optStr(body.vertical, "giro", 30) ?? "otro";
  const [exists] = await sql`select 1 from r87_merchants where owner_email = ${email}`;
  if (exists) throw new HttpError(409, "Ya existe una cuenta con ese correo. Inicia sesión.");

  const base = slugify(name);
  let slug = base;
  for (let i = 2; (await sql`select 1 from r87_merchants where slug = ${slug}`).length; i++) slug = `${base}-${i}`;

  const presets: Record<string, { reward: string; stamps: number; ticket: number }> = {
    fonda: { reward: "Orden de tacos gratis", stamps: 8, ticket: 130 },
    cafe: { reward: "Café gratis", stamps: 10, ticket: 90 },
    resto: { reward: "Postre gratis", stamps: 8, ticket: 300 },
    bar: { reward: "Botana gratis", stamps: 6, ticket: 400 },
    alta: { reward: "Postre de la casa", stamps: 6, ticket: 900 },
    cadena: { reward: "Producto gratis", stamps: 8, ticket: 250 },
    barberia: { reward: "Corte gratis", stamps: 8, ticket: 180 },
    cafeteria: { reward: "Café gratis", stamps: 10, ticket: 70 },
    belleza: { reward: "Servicio gratis", stamps: 6, ticket: 350 },
    veterinaria: { reward: "Baño gratis para tu mascota", stamps: 6, ticket: 400 },
    retail: { reward: "10% de descuento", stamps: 5, ticket: 500 },
    restaurante: { reward: "Postre gratis", stamps: 8, ticket: 250 },
  };
  const p = presets[vertical] ?? { reward: "Postre gratis", stamps: 8, ticket: 250 };
  const [m] = await sql<{ id: string }[]>`insert into r87_merchants
    (slug, name, owner_email, pass_hash, vertical, reward_text, stamps_required, ticket_avg)
    values (${slug}, ${name}, ${email}, ${await hashSecret(password)}, ${vertical}, ${p.reward}, ${p.stamps}, ${p.ticket})
    returning id`;
  return { token: await createSession(m.id, "owner", null), slug };
}

async function login(body: Record<string, unknown>) {
  const email = str(body.email, "correo", { max: 120 }).toLowerCase();
  const password = str(body.password, "contraseña", { max: 128 });
  const [m] = await sql`select id, pass_hash, login_locked_until from r87_merchants where owner_email = ${email}`;
  if (m?.login_locked_until && new Date(m.login_locked_until) > new Date()) {
    throw new HttpError(429, "Demasiados intentos. Espera 15 minutos.");
  }
  if (!m || !(await verifySecret(password, m.pass_hash))) {
    if (m) {
      await sql`update r87_merchants set
        login_locked_until = case when login_failures + 1 >= 8 then now() + interval '15 minutes' end,
        login_failures = case when login_failures + 1 >= 8 then 0 else login_failures + 1 end where id = ${m.id}`;
    }
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  }
  await sql`update r87_merchants set login_failures = 0, login_locked_until = null where id = ${m.id}`;
  return { token: await createSession(m.id, "owner", null) };
}

async function staffLogin(body: Record<string, unknown>) {
  const slug = str(body.slug, "negocio", { max: 60 }).toLowerCase();
  const pin = str(body.pin, "PIN", { min: 4, max: 8 });
  const staffName = optStr(body.staff_name, "tu nombre", 40);
  const [m] = await sql`select id, staff_pin_hash, pin_locked_until from r87_merchants where slug = ${slug}`;
  if (!m || !m.staff_pin_hash) throw new HttpError(404, "Ese negocio no existe o aún no tiene PIN de personal.");
  if (m.pin_locked_until && new Date(m.pin_locked_until) > new Date()) {
    throw new HttpError(429, "Demasiados intentos con PIN incorrecto. Espera 15 minutos.");
  }
  if (!(await verifySecret(pin, m.staff_pin_hash))) {
    await sql`update r87_merchants set
      pin_locked_until = case when pin_failures + 1 >= 10 then now() + interval '15 minutes' end,
      pin_failures = case when pin_failures + 1 >= 10 then 0 else pin_failures + 1 end where id = ${m.id}`;
    throw new HttpError(401, "PIN incorrecto.");
  }
  await sql`update r87_merchants set pin_failures = 0, pin_locked_until = null where id = ${m.id}`;
  return { token: await createSession(m.id, "staff", staffName) };
}

async function updateMerchant(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const u: Record<string, unknown> = {};
  if ("name" in body) u.name = str(body.name, "nombre", { min: 2, max: 60 });
  if ("vertical" in body) u.vertical = str(body.vertical, "giro", { max: 30 });
  if ("reward_text" in body) u.reward_text = str(body.reward_text, "recompensa", { min: 2, max: 60 });
  if ("stamps_required" in body) u.stamps_required = int(body.stamps_required, "sellos necesarios", 3, 20);
  if ("inactive_days" in body) u.inactive_days = int(body.inactive_days, "días para inactivo", 3, 365);
  if ("stamp_cooldown_min" in body) u.stamp_cooldown_min = int(body.stamp_cooldown_min, "minutos entre sellos", 0, 1440);
  if ("ticket_avg" in body) u.ticket_avg = int(body.ticket_avg, "ticket promedio", 1, 1_000_000);
  if ("color_bg" in body) u.color_bg = hexColor(body.color_bg, "color de fondo");
  if ("color_fg" in body) u.color_fg = hexColor(body.color_fg, "color de texto");
  if ("color_accent" in body) u.color_accent = hexColor(body.color_accent, "color de acento");
  if ("logo_png" in body) {
    u.logo_png = pngDataUrl(body.logo_png, "logo", 300_000);
    if (u.logo_png && !(m.status === "active" && hasPaid(m))) {
      throw new HttpError(402, "Tu logo se activa cuando pagas tu plan. Mientras tanto, elige un tema y tus colores.");
    }
  }
  if ("design" in body) u.design = sanitizeDesign(body.design);
  if ("nearby" in body) u.nearby = nearbyMode(body.nearby);
  if ("icon_png" in body) u.icon_png = pngDataUrl(body.icon_png, "icono", 100_000);
  if ("address" in body) u.address = optStr(body.address, "dirección", 160);
  if ("lat" in body || "lng" in body) {
    const lat = body.lat === null || body.lat === "" ? null : Number(body.lat);
    const lng = body.lng === null || body.lng === "" ? null : Number(body.lng);
    if ((lat === null) !== (lng === null)) throw new HttpError(400, "Indica latitud y longitud juntas.");
    if (lat !== null && (!(Math.abs(lat) <= 90) || !(Math.abs(lng!) <= 180))) throw new HttpError(400, "Coordenadas inválidas.");
    u.lat = lat;
    u.lng = lng;
  }
  if ("staff_pin" in body) {
    const pin = String(body.staff_pin ?? "");
    if (!/^\d{4,8}$/.test(pin)) throw new HttpError(400, "El PIN del personal debe tener de 4 a 8 dígitos.");
    u.staff_pin_hash = await hashSecret(pin);
  }
  if (Object.keys(u).length === 0) return { merchant: m };
  if (u.design) u.design = sql.json(u.design as Record<string, string>);
  await sql`update r87_merchants set ${sql(u)} where id = ${m.id}`;
  const updated = await getMerchant(m.id);
  const brandingChanged = ["name", "color_bg", "logo_png", "reward_text", "stamps_required"].some((k) => k in u);
  if (brandingChanged) background(google.updateClass(updated, logoUrl(updated)));
  if (["lat", "lng", "nearby", "name", "color_bg", "color_fg", "color_accent", "logo_png", "reward_text", "stamps_required"].some((k) => k in u)) {
    background(refreshAllPasses(updated));
  }
  return { merchant: updated };
}

async function dashboard(s: Session) {
  const m = await getMerchant(s.merchant_id);
  const [stats] = await sql`select
      count(*)::int as customers,
      count(*) filter (where created_at > now() - interval '30 days')::int as new_30d,
      count(*) filter (where last_visit_at < now() - make_interval(days => ${m.inactive_days}))::int as inactive,
      count(*) filter (where stamps >= ${m.stamps_required - 1})::int as near_reward,
      count(*) filter (where marketing_opt_in)::int as opted_in,
      coalesce(sum(rewards_available), 0)::int as rewards_pending
    from r87_customers where merchant_id = ${m.id}`;
  const [ev] = await sql`select
      count(*) filter (where kind = 'stamp')::int as visits_30d,
      count(*) filter (where kind = 'stamp' and (meta->>'reactivated')::boolean)::int as reactivated_30d,
      count(*) filter (where kind = 'redeem')::int as redeemed_30d
    from r87_events where merchant_id = ${m.id} and created_at > now() - interval '30 days'`;
  const daily = await sql`select to_char(d, 'YYYY-MM-DD') as day, coalesce(count(e.id), 0)::int as visits
    from generate_series(current_date - 13, current_date, interval '1 day') d
    left join r87_events e on e.merchant_id = ${m.id} and e.kind = 'stamp' and e.created_at::date = d::date
    group by d order by d`;
  const [wallet] = await sql`select count(distinct r.serial)::int as apple
    from r87_apple_registrations r join r87_customers c on c.serial = r.serial where c.merchant_id = ${m.id}`;
  const recent = await sql`select e.kind, e.staff_name, e.created_at, e.meta, c.name
    from r87_events e left join r87_customers c on c.id = e.customer_id
    where e.merchant_id = ${m.id} order by e.created_at desc limit 12`;
  return {
    merchant: m,
    role: s.role,
    account: {
      ...accountState(m),
      status: m.status,
      plan: m.plan,
      plan_name: PLANS[m.plan]?.name ?? null,
      paid_until: m.paid_until,
      contact_whatsapp: await contactWhatsapp(sql),
    },
    stats: {
      ...stats,
      ...ev,
      apple_passes: wallet.apple,
      recovered_revenue_30d: ev.reactivated_30d * m.ticket_avg,
    },
    daily,
    recent,
    wallet: { apple: appleConfig().enabled, google: google.googleConfig().enabled },
  };
}

async function listCustomers(s: Session, url: URL) {
  const m = await getMerchant(s.merchant_id);
  const filter = url.searchParams.get("filter") ?? "all";
  const q = (url.searchParams.get("q") ?? "").trim();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await sql`select id, name, phone, email, marketing_opt_in, stamps, rewards_available, rewards_redeemed,
      total_visits, last_visit_at, created_at,
      floor(extract(epoch from now() - coalesce(last_visit_at, created_at)) / 86400)::int as days_since
    from r87_customers
    where merchant_id = ${m.id}
      ${filter === "inactive" ? sql`and last_visit_at < now() - make_interval(days => ${m.inactive_days})` : sql``}
      ${filter === "near" ? sql`and stamps >= ${m.stamps_required - 1}` : sql``}
      ${filter === "rewards" ? sql`and rewards_available > 0` : sql``}
      ${q ? sql`and (name ilike ${like} or phone like ${like})` : sql``}
    order by ${filter === "inactive" ? sql`last_visit_at asc` : sql`coalesce(last_visit_at, created_at) desc`}
    limit 500`;
  return { customers: rows, inactive_days: m.inactive_days };
}

// ---------- Sellado y canje ----------

function serialFromCode(code: unknown): string {
  const raw = String(code ?? "").trim();
  const fromUrl = raw.match(/[?&]s=([A-Za-z0-9_-]{16,})/);
  if (fromUrl) return fromUrl[1];
  const m = raw.match(/^(?:R87:)?([A-Za-z0-9_-]{16,})$/);
  if (!m) throw new HttpError(400, "Ese código no es una tarjeta de Rojo 87.");
  return m[1];
}

async function stamp(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const serial = serialFromCode(body.code);
  const force = body.force === true;
  const result = await sql.begin(async (tx) => {
    const [c] = await tx<Customer[]>`select * from r87_customers where serial = ${serial} for update`;
    if (!c || c.merchant_id !== m.id) throw new HttpError(404, "Esta tarjeta no pertenece a tu negocio.");
    const sinceMs = c.last_visit_at ? Date.now() - new Date(c.last_visit_at).getTime() : Infinity;
    if (!force && sinceMs < m.stamp_cooldown_min * 60_000) {
      return { cooldown: true, minutes_ago: Math.floor(sinceMs / 60_000), customer: c };
    }
    const reactivated = c.last_visit_at !== null && isInactive(c, m);
    let stamps = c.stamps + 1;
    let rewards = c.rewards_available;
    let unlocked = false;
    // "while" por si el dueño bajó los sellos necesarios y el cliente ya tenía de más.
    while (stamps >= m.stamps_required) {
      stamps -= m.stamps_required;
      rewards += 1;
      unlocked = true;
    }
    const [updated] = await tx<Customer[]>`update r87_customers set stamps = ${stamps}, rewards_available = ${rewards},
      total_visits = total_visits + 1, last_visit_at = now(), updated_at = now() where id = ${c.id} returning *`;
    await tx`insert into r87_events (merchant_id, customer_id, kind, staff_name, meta) values
      (${m.id}, ${c.id}, 'stamp', ${s.staff_name}, ${sql.json({
      reactivated,
      unlocked,
      days_since: c.last_visit_at ? Math.floor(sinceMs / DAY) : null,
    })})`;
    return { cooldown: false, unlocked, reactivated, customer: updated };
  });
  if (!result.cooldown) background(notifyWallets(m, [result.customer]));
  return { ...result, stamps_required: m.stamps_required, customer: publicCustomer(result.customer) };
}

async function redeem(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const serial = serialFromCode(body.code);
  const [c] = await sql<Customer[]>`update r87_customers set rewards_available = rewards_available - 1,
      rewards_redeemed = rewards_redeemed + 1, updated_at = now()
    where serial = ${serial} and merchant_id = ${m.id} and rewards_available > 0 returning *`;
  if (!c) throw new HttpError(409, "Esta tarjeta no tiene premios disponibles.");
  await sql`insert into r87_events (merchant_id, customer_id, kind, staff_name) values (${m.id}, ${c.id}, 'redeem', ${s.staff_name})`;
  background(notifyWallets(m, [c]));
  return { customer: publicCustomer(c), stamps_required: m.stamps_required };
}

// Busca por código de la tarjeta o, si el cliente no trae el teléfono a la mano, por su número.
async function lookup(s: Session, url: URL) {
  const code = (url.searchParams.get("code") ?? "").trim();
  const isPhone = /^\+?[\d\s()-]{10,20}$/.test(code);
  const [c] = isPhone
    ? await sql<Customer[]>`select * from r87_customers where phone = ${normalizePhone(code)} and merchant_id = ${s.merchant_id}`
    : await sql<Customer[]>`select * from r87_customers where serial = ${serialFromCode(code)} and merchant_id = ${s.merchant_id}`;
  if (!c) throw new HttpError(404, isPhone ? "No hay ninguna tarjeta con ese teléfono." : "Esta tarjeta no pertenece a tu negocio.");
  const m = await getMerchant(s.merchant_id);
  return { customer: publicCustomer(c), stamps_required: m.stamps_required, reward_text: m.reward_text };
}

function publicCustomer(c: Customer) {
  return {
    serial: c.serial,
    name: c.name,
    stamps: c.stamps,
    rewards_available: c.rewards_available,
    total_visits: c.total_visits,
    last_visit_at: c.last_visit_at,
  };
}

// ---------- Campañas ----------

async function campaign(s: Session, body: Record<string, unknown>) {
  const m = await getMerchant(s.merchant_id);
  const segment = str(body.segment, "segmento", { max: 20 });
  const message = str(body.message, "mensaje", { min: 5, max: 160 });
  const where = {
    all: sql``,
    inactive: sql`and last_visit_at < now() - make_interval(days => ${m.inactive_days})`,
    near: sql`and stamps >= ${m.stamps_required - 1}`,
    rewards: sql`and rewards_available > 0`,
  }[segment];
  if (!where) throw new HttpError(400, "Segmento desconocido.");
  // Solo clientes que aceptaron recibir promociones.
  const targets = await sql<Customer[]>`update r87_customers set last_message = ${message}, last_message_at = now(), updated_at = now()
    where merchant_id = ${m.id} and marketing_opt_in ${where} returning *`;
  await sql`insert into r87_campaigns (merchant_id, segment, message, recipients) values (${m.id}, ${segment}, ${message}, ${targets.length})`;
  await sql`insert into r87_events (merchant_id, kind, meta) values (${m.id}, 'campaign', ${sql.json({ segment, recipients: targets.length })})`;
  background(notifyWallets(m, targets, message));
  return { recipients: targets.length };
}

async function listCampaigns(s: Session) {
  const rows = await sql`select segment, message, recipients, created_at from r87_campaigns
    where merchant_id = ${s.merchant_id} order by created_at desc limit 50`;
  return { campaigns: rows };
}

// ---------- Público: alta del cliente y tarjeta ----------

async function publicMerchant(slug: string) {
  const [m] = await sql`select ${MERCHANT_PUBLIC_COLS} from r87_merchants where slug = ${slug}`;
  if (!m) throw new HttpError(404, "Este negocio no existe.");
  const { status, pending_since, paid_until, ...pub } = withPaidBranding(m as never) as Record<string, unknown>;
  return { merchant: { ...pub, accepting: !isBlocked({ status, pending_since, paid_until } as never) } };
}

async function join(slug: string, body: Record<string, unknown>) {
  const [m] = await sql<Merchant[]>`select id, status, pending_since, paid_until from r87_merchants where slug = ${slug}`;
  if (!m) throw new HttpError(404, "Este negocio no existe.");
  if (isBlocked(m)) throw new HttpError(403, "Este negocio no está entregando tarjetas por ahora.");
  const name = str(body.name, "nombre", { min: 2, max: 60 });
  const phone = normalizePhone(body.phone);
  const email = optStr(body.email, "correo", 120);
  if (body.accept_terms !== true) throw new HttpError(400, "Debes aceptar el aviso de privacidad.");
  const optIn = body.marketing_opt_in === true;
  const [existing] = await sql`select serial from r87_customers where merchant_id = ${m.id} and phone = ${phone}`;
  if (existing) return { serial: existing.serial, existing: true };
  const [c] = await sql`insert into r87_customers (merchant_id, name, phone, email, marketing_opt_in, serial, auth_token)
    values (${m.id}, ${name}, ${phone}, ${email}, ${optIn}, ${randomToken(16)}, ${randomToken(24)})
    on conflict (merchant_id, phone) do update set name = r87_customers.name
    returning id, serial`;
  await sql`insert into r87_events (merchant_id, customer_id, kind) values (${m.id}, ${c.id}, 'join')`;
  return { serial: c.serial, existing: false };
}

async function cardBySerial(serial: string): Promise<{ m: Merchant; c: Customer }> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(serial)) throw new HttpError(404, "Tarjeta no encontrada.");
  const [c] = await sql<Customer[]>`select * from r87_customers where serial = ${serial}`;
  if (!c) throw new HttpError(404, "Tarjeta no encontrada.");
  return { c, m: await getMerchant(c.merchant_id) };
}

async function publicCard(serial: string) {
  const { m, c } = await cardBySerial(serial);
  const recentMessage = c.last_message && c.last_message_at && Date.now() - new Date(c.last_message_at).getTime() < 14 * DAY;
  return {
    merchant: {
      slug: m.slug,
      name: m.name,
      logo_png: hasPaid(m) ? m.logo_png : null,
      design: m.design ?? {},
      color_bg: m.color_bg,
      color_fg: m.color_fg,
      color_accent: m.color_accent,
      reward_text: m.reward_text,
      stamps_required: m.stamps_required,
      address: m.address,
    },
    card: {
      serial: c.serial,
      name: c.name,
      stamps: c.stamps,
      rewards_available: c.rewards_available,
      total_visits: c.total_visits,
      last_visit_at: c.last_visit_at,
      message: recentMessage ? c.last_message : null,
      message_at: recentMessage ? c.last_message_at : null,
      updated_at: c.updated_at,
    },
    wallet: { apple: appleConfig().enabled, google: google.googleConfig().enabled },
  };
}

async function pkpassResponse(serial: string, ifModifiedSince?: string | null): Promise<Response> {
  const { m, c } = await cardBySerial(serial);
  if (!appleConfig().enabled) throw new HttpError(503, "Apple Wallet todavía no está activado en Rojo 87.");
  const lastModified = new Date(c.updated_at);
  lastModified.setMilliseconds(0);
  if (ifModifiedSince && new Date(ifModifiedSince) >= lastModified) {
    return new Response(null, { status: 304, headers: CORS_HEADERS });
  }
  const file = await buildPkpass(withPaidBranding(m), c, `${PUBLIC_BASE}/apple`);
  return new Response(file as BodyInit, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${m.slug}.pkpass"`,
      "Last-Modified": lastModified.toUTCString(),
      "Cache-Control": "no-store",
    },
  });
}

async function googleSave(serial: string, origin: string | null) {
  const { m, c } = await cardBySerial(serial);
  if (!google.googleConfig().enabled) throw new HttpError(503, "Google Wallet todavía no está activado en Rojo 87.");
  return { url: await google.saveUrl(m, c, logoUrl(m), origin) };
}

async function logoPng(slug: string): Promise<Response> {
  const [m] = await sql`select logo_png, icon_png, paid_until from r87_merchants where slug = ${slug}`;
  const data = m && hasPaid(m as never) ? m.logo_png ?? m.icon_png : null;
  if (!data) {
    const { DEFAULT_ICON_PNG_B64 } = await import("./assets.ts");
    return new Response(Uint8Array.from(atob(DEFAULT_ICON_PNG_B64), (ch) => ch.charCodeAt(0)), {
      headers: { ...CORS_HEADERS, "Content-Type": "image/png" },
    });
  }
  const bin = atob(data.slice(data.indexOf(",") + 1));
  return new Response(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)), {
    headers: { ...CORS_HEADERS, "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
  });
}

// ---------- Tarea diaria (pg_cron) ----------

// Los clientes que se volvieron inactivos en el último día reciben su pase actualizado,
// que ahora incluye la ubicación del local para el recordatorio por cercanía.
async function cronInactive(req: Request) {
  const [s] = await sql`select value from r87_settings where key = 'cron_secret'`;
  if (!s?.value || req.headers.get("x-cron-secret") !== s.value) throw new HttpError(401, "No autorizado.");
  if (!appleConfig().enabled) return { ok: true, refreshed: 0 };
  const merchants = await sql<Merchant[]>`select ${MERCHANT_COLS} from r87_merchants
    where nearby = 'inactive' and lat is not null and lng is not null and status = 'active'`;
  let refreshed = 0;
  for (const m of merchants) {
    const customers = await sql<Customer[]>`update r87_customers c set updated_at = now()
      where c.merchant_id = ${m.id}
        and c.last_visit_at between now() - make_interval(days => ${m.inactive_days + 1}) and now() - make_interval(days => ${m.inactive_days})
        and exists (select 1 from r87_apple_registrations r where r.serial = c.serial)
      returning c.*`;
    refreshed += customers.length;
    await notifyWallets(m, customers);
  }
  return { ok: true, refreshed };
}

// ---------- Servicio web de PassKit (lo llama el iPhone) ----------

async function appleWebService(req: Request, parts: string[]): Promise<Response> {
  const cfg = appleConfig();
  const authToken = (req.headers.get("authorization") ?? "").replace(/^ApplePass\s+/, "");
  const authorized = async (serial: string) => {
    const [c] = await sql`select auth_token from r87_customers where serial = ${serial}`;
    return c && c.auth_token === authToken;
  };
  // v1/log
  if (parts[1] === "log") {
    const body = await req.json().catch(() => ({}));
    console.log("PassKit log", JSON.stringify(body).slice(0, 2000));
    return new Response(null, { status: 200 });
  }
  // v1/devices/{device}/registrations/{passTypeId}[/{serial}]
  if (parts[1] === "devices" && parts[3] === "registrations" && parts[4] === cfg.passTypeId) {
    const device = parts[2];
    const serial = parts[5];
    if (serial) {
      if (!(await authorized(serial))) return new Response(null, { status: 401 });
      if (req.method === "POST") {
        const { pushToken } = await req.json();
        const [prev] = await sql`select 1 from r87_apple_registrations where device_library_id = ${device} and serial = ${serial}`;
        await sql`insert into r87_apple_registrations (device_library_id, serial, push_token)
          values (${device}, ${serial}, ${String(pushToken)})
          on conflict (device_library_id, serial) do update set push_token = excluded.push_token`;
        return new Response(null, { status: prev ? 200 : 201 });
      }
      if (req.method === "DELETE") {
        await sql`delete from r87_apple_registrations where device_library_id = ${device} and serial = ${serial}`;
        return new Response(null, { status: 200 });
      }
    } else if (req.method === "GET") {
      const since = new URL(req.url).searchParams.get("passesUpdatedSince");
      const sinceDate = since ? new Date(Number(since)) : new Date(0);
      const rows = await sql`select c.serial, c.updated_at from r87_apple_registrations r
        join r87_customers c on c.serial = r.serial
        where r.device_library_id = ${device} and c.updated_at > ${sinceDate}`;
      if (rows.length === 0) return new Response(null, { status: 204 });
      const last = Math.max(...rows.map((r) => new Date(r.updated_at).getTime()));
      return Response.json({ serialNumbers: rows.map((r) => r.serial), lastUpdated: String(last) });
    }
  }
  // v1/passes/{passTypeId}/{serial}
  if (parts[1] === "passes" && parts[2] === cfg.passTypeId && parts[3] && req.method === "GET") {
    if (!(await authorized(parts[3]))) return new Response(null, { status: 401 });
    return pkpassResponse(parts[3], req.headers.get("if-modified-since"));
  }
  return new Response(null, { status: 404 });
}

// ---------- Router ----------

async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/rojo87(?=\/|$)/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  const method = req.method;
  const body = async () => (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (parts[0] === "apple") return appleWebService(req, parts.slice(1));
  if (parts[0] !== "api") return json({ name: "Rojo 87 API", ok: true });
  const r = parts.slice(1).join("/");

  if (r === "health") {
    // deno-lint-ignore no-explicit-any
    const clientCerts = typeof (Deno as any).createHttpClient === "function";
    return json({ ok: true, apple: appleConfig().enabled, google: google.googleConfig().enabled, apns_client_certs: clientCerts });
  }
  if (r === "signup" && method === "POST") return json(await signup(await body()), 201);
  if (r === "login" && method === "POST") return json(await login(await body()));
  if (r === "staff-login" && method === "POST") return json(await staffLogin(await body()));
  if (r === "logout" && method === "POST") {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
    await sql`delete from r87_sessions where token_hash = ${await sha256Hex(token)}`;
    return json({ ok: true });
  }
  if (r === "me" && method === "GET") return json(await dashboard(await requireSession(req)));
  if (r === "merchant" && method === "PUT") return json(await updateMerchant(await requireActive(req, "owner"), await body()));
  if (r === "customers" && method === "GET") return json(await listCustomers(await requireActive(req, "owner"), url));
  if (r === "lookup" && method === "GET") return json(await lookup(await requireActive(req), url));
  if (r === "stamp" && method === "POST") return json(await stamp(await requireActive(req), await body()));
  if (r === "redeem" && method === "POST") return json(await redeem(await requireActive(req), await body()));
  if (r === "campaigns" && method === "GET") return json(await listCampaigns(await requireActive(req, "owner")));
  if (r === "campaigns" && method === "POST") return json(await campaign(await requireActive(req, "owner"), await body()));
  if (parts[1] === "admin") return handleAdmin(sql, req, parts);
  if (r === "cron/inactive" && method === "POST") return json(await cronInactive(req));

  // Público
  if (parts[1] === "public") {
    const [, , kind, id, extra] = parts;
    if (kind === "m" && id && !extra && method === "GET") return json(await publicMerchant(id));
    if (kind === "m" && id && extra === "logo.png") return logoPng(id);
    if (kind === "m" && id && extra === "join" && method === "POST") return json(await join(id, await body()), 201);
    if (kind === "card" && id && !extra && method === "GET") return json(await publicCard(id));
    if (kind === "card" && id && extra === "pass.pkpass") return pkpassResponse(id);
    if (kind === "card" && id && extra === "google") return json(await googleSave(id, req.headers.get("origin")));
  }
  throw new HttpError(404, "Ruta no encontrada.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  try {
    return await route(req);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Error interno. Intenta de nuevo." }, 500);
  }
});
