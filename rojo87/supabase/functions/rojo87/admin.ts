// Administración de Rojo 87 (página oculta lealtad/llave-maestra.html).
// Sin pasarela de pago: el dueño de Rojo 87 cobra por transferencia o efectivo y aquí
// aprueba cuentas, registra pagos (plan + meses), cancela o reactiva membresías.
// Las cuentas que no se aprueban se borran solas 12 h después de registrarse (pg_cron).
import type postgres from "npm:postgres@3.4.5";
import { HttpError, int, json, optStr, randomToken, sha256Hex, str, verifySecret } from "./util.ts";

// Planes de Rojo 87 en MXN al mes (los mismos del sitio, rojo87/app.js → PRICES.MXN).
// La lealtad (luz 5, Regreso) viene en Completo y Cadena; "prueba" es el primer mes por $1 USD.
export const PLANS: Record<string, { name: string; price: number }> = {
  prueba: { name: "Primer mes ($1)", price: 20 },
  carta: { name: "Carta", price: 290 },
  servicio: { name: "Servicio", price: 690 },
  completo: { name: "Completo", price: 1290 },
  cadena: { name: "Cadena (por sucursal)", price: 990 },
};
export const PENDING_HOURS = 12;
export const GRACE_DAYS = 3;

type Acct = { status: string; pending_since: string; paid_until: string | null };

export function accountState(m: Acct) {
  if (m.status === "pending") {
    return { state: "pending", deletes_at: new Date(new Date(m.pending_since).getTime() + PENDING_HOURS * 3600_000).toISOString() };
  }
  if (m.status === "cancelled") return { state: "cancelled" };
  if (m.paid_until && Date.now() > new Date(m.paid_until).getTime() + GRACE_DAYS * 86_400_000) return { state: "expired" };
  return { state: "active" };
}

export const isBlocked = (m: Acct) => ["cancelled", "expired"].includes(accountState(m).state);

async function setting(sql: postgres.Sql, key: string) {
  const [r] = await sql`select value from r87_settings where key = ${key}`;
  return r?.value ?? null;
}
async function putSetting(sql: postgres.Sql, key: string, value: string | null) {
  await sql`insert into r87_settings (key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value`;
}

export async function contactWhatsapp(sql: postgres.Sql) {
  return (await setting(sql, "contact_whatsapp")) || null;
}

async function login(sql: postgres.Sql, body: Record<string, unknown>) {
  const locked = await setting(sql, "admin_locked_until");
  if (locked && new Date(locked) > new Date()) throw new HttpError(429, "Demasiados intentos. Espera 30 minutos.");
  const password = str(body.password, "clave", { max: 200 });
  if (!(await verifySecret(password, await setting(sql, "admin_pass_hash")))) {
    const fails = Number(await setting(sql, "admin_failures")) + 1;
    if (fails >= 5) {
      await putSetting(sql, "admin_failures", "0");
      await putSetting(sql, "admin_locked_until", new Date(Date.now() + 30 * 60_000).toISOString());
    } else await putSetting(sql, "admin_failures", String(fails));
    throw new HttpError(401, "Clave incorrecta.");
  }
  await putSetting(sql, "admin_failures", "0");
  const token = randomToken(32);
  await sql`insert into r87_admin_sessions (token_hash, expires_at) values (${await sha256Hex(token)}, now() + interval '12 hours')`;
  return { token };
}

async function requireAdmin(sql: postgres.Sql, req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!token) throw new HttpError(401, "Entra con la clave.");
  const [s] = await sql`select 1 from r87_admin_sessions where token_hash = ${await sha256Hex(token)} and expires_at > now()`;
  if (!s) throw new HttpError(401, "Tu sesión expiró. Entra de nuevo.");
}

async function overview(sql: postgres.Sql) {
  // Respaldo del borrado automático por si pg_cron va atrasado.
  await sql`delete from r87_merchants where status = 'pending' and pending_since < now() - make_interval(hours => ${PENDING_HOURS})`;
  const rows = await sql`select m.id, m.slug, m.name, m.owner_email, m.vertical, m.status, m.plan, m.pending_since, m.paid_until,
      m.approved_at, m.cancelled_at, m.admin_note, m.created_at, m.logo_png is not null as has_logo,
      (select count(*)::int from r87_customers c where c.merchant_id = m.id) as customers,
      (select count(*)::int from r87_events e where e.merchant_id = m.id and e.kind = 'stamp' and e.created_at > now() - interval '30 days') as visits_30d,
      (select max(e.created_at) from r87_events e where e.merchant_id = m.id) as last_activity,
      (select coalesce(sum(p.amount), 0)::float8 from r87_payments p where p.merchant_id = m.id) as total_paid
    from r87_merchants m order by m.created_at desc`;
  // deno-lint-ignore no-explicit-any
  const merchants: any[] = rows.map((m) => ({ ...m, ...accountState(m as unknown as Acct) }));
  const active = merchants.filter((m) => m.state === "active");
  const [paid] = await sql`select coalesce(sum(amount), 0)::float8 as month from r87_payments where created_at > date_trunc('month', now())`;
  return {
    merchants,
    plans: PLANS,
    settings: { contact_whatsapp: await contactWhatsapp(sql) },
    kpis: {
      active: active.length,
      pending: merchants.filter((m) => m.state === "pending").length,
      blocked: merchants.filter((m) => m.state === "cancelled" || m.state === "expired").length,
      mrr: active.reduce((s, m) => s + (PLANS[m.plan as string]?.price ?? 0), 0),
      collected_this_month: paid.month,
      expiring_7d: active.filter((m) => m.paid_until && new Date(m.paid_until as string).getTime() - Date.now() < 7 * 86_400_000).length,
    },
  };
}

async function merchantById(sql: postgres.Sql, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(404, "Negocio no encontrado.");
  const [m] = await sql`select id, slug, status, plan, paid_until from r87_merchants where id = ${id}`;
  if (!m) throw new HttpError(404, "Negocio no encontrado (quizá ya se borró).");
  return m;
}

// Aprueba una cuenta pendiente o registra un pago: suma los meses a partir de hoy
// o de la fecha de vencimiento actual si todavía no vence.
async function activate(sql: postgres.Sql, id: string, body: Record<string, unknown>) {
  const m = await merchantById(sql, id);
  const plan = str(body.plan, "plan", { max: 20 });
  if (!PLANS[plan]) throw new HttpError(400, "Plan desconocido.");
  const months = int(body.months, "meses", 1, 24);
  const amount = Number(body.amount ?? PLANS[plan].price * months);
  if (!(amount >= 0)) throw new HttpError(400, "Monto inválido.");
  const method = optStr(body.method, "método", 30);
  const note = optStr(body.note, "nota", 300);
  const base = m.paid_until && new Date(m.paid_until) > new Date() ? new Date(m.paid_until) : new Date();
  const until = new Date(base);
  until.setMonth(until.getMonth() + months);
  await sql.begin(async (tx) => {
    await tx`update r87_merchants set status = 'active', plan = ${plan}, paid_until = ${until},
      approved_at = coalesce(approved_at, now()), cancelled_at = null where id = ${id}`;
    await tx`insert into r87_payments (merchant_id, plan, months, amount, method, note, paid_until)
      values (${id}, ${plan}, ${months}, ${amount}, ${method}, ${note}, ${until})`;
  });
  return { ok: true, paid_until: until.toISOString() };
}

export async function handleAdmin(sql: postgres.Sql, req: Request, parts: string[]): Promise<Response> {
  const body = async () => (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const [, , a, id, action] = parts; // api/admin/<a>/<id>/<action>
  if (a === "login" && req.method === "POST") return json(await login(sql, await body()));
  await requireAdmin(sql, req);
  if (a === "logout" && req.method === "POST") {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
    await sql`delete from r87_admin_sessions where token_hash = ${await sha256Hex(token)}`;
    return json({ ok: true });
  }
  if (a === "overview" && req.method === "GET") return json(await overview(sql));
  if (a === "settings" && req.method === "PUT") {
    const b = await body();
    const wa = String(b.contact_whatsapp ?? "").replace(/\D/g, "");
    if (wa && (wa.length < 10 || wa.length > 15)) throw new HttpError(400, "WhatsApp inválido.");
    await putSetting(sql, "contact_whatsapp", wa);
    return json({ ok: true });
  }
  if (a === "m" && id) {
    if (action === "payments" && req.method === "GET") {
      await merchantById(sql, id);
      return json({ payments: await sql`select plan, months, amount::float8 as amount, method, note, paid_until, created_at
        from r87_payments where merchant_id = ${id} order by created_at desc` });
    }
    if (req.method !== "POST") throw new HttpError(405, "Método no permitido.");
    const b = await body();
    if (action === "activate") return json(await activate(sql, id, b));
    await merchantById(sql, id);
    if (action === "cancel") {
      await sql`update r87_merchants set status = 'cancelled', cancelled_at = now() where id = ${id}`;
      return json({ ok: true });
    }
    if (action === "reactivate") {
      const [m] = await sql`update r87_merchants set status = 'active', cancelled_at = null
        where id = ${id} and paid_until > now() returning id`;
      if (!m) throw new HttpError(409, "Su membresía ya venció: registra un pago para reactivarla.");
      return json({ ok: true });
    }
    if (action === "extend") {
      await sql`update r87_merchants set pending_since = now() where id = ${id} and status = 'pending'`;
      return json({ ok: true });
    }
    if (action === "note") {
      await sql`update r87_merchants set admin_note = ${optStr(b.note, "nota", 500)} where id = ${id}`;
      return json({ ok: true });
    }
    if (action === "delete") {
      const [m] = await sql`select slug from r87_merchants where id = ${id}`;
      if (b.confirm !== m.slug) throw new HttpError(400, "Escribe el código del negocio para confirmar.");
      await sql`delete from r87_merchants where id = ${id}`;
      return json({ ok: true });
    }
  }
  throw new HttpError(404, "Ruta no encontrada.");
}
