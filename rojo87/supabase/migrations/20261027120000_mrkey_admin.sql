-- Membresías administradas a mano (sin pasarela de pago) y borrado automático de cuentas no aprobadas.
-- La clave de administrador se guarda aparte como hash PBKDF2 en mk_settings('admin_pass_hash'); nunca en el repo.
alter table public.mk_merchants
  add column status text not null default 'pending' check (status in ('pending','active','cancelled')),
  add column pending_since timestamptz not null default now(),
  add column approved_at timestamptz,
  add column paid_until timestamptz,
  add column cancelled_at timestamptz,
  add column admin_note text;
alter table public.mk_merchants alter column plan set default 'ninguno';
update public.mk_merchants set plan = 'ninguno' where plan = 'trial';

create table public.mk_payments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.mk_merchants(id) on delete cascade,
  plan text not null,
  months int not null,
  amount numeric not null default 0,
  method text,
  note text,
  paid_until timestamptz not null,
  created_at timestamptz not null default now()
);
create index mk_payments_merchant on public.mk_payments (merchant_id, created_at desc);

create table public.mk_settings (key text primary key, value text);
create table public.mk_admin_sessions (
  token_hash text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.mk_payments enable row level security;
alter table public.mk_settings enable row level security;
alter table public.mk_admin_sessions enable row level security;

create extension if not exists pg_cron;
select cron.schedule('mrkey-borrar-pendientes', '*/10 * * * *',
  $$delete from public.mk_merchants where status = 'pending' and pending_since < now() - interval '12 hours'$$);
