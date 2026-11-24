-- Mr Key: esquema completo (ya aplicado en el proyecto de Supabase "LukOffMon's Project").
create table public.mk_merchants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_email text unique not null,
  pass_hash text not null,
  staff_pin_hash text,
  vertical text not null default 'otro',
  logo_png text,
  icon_png text,
  color_bg text not null default '#111111',
  color_fg text not null default '#ffffff',
  color_accent text not null default '#d6b47a',
  reward_text text not null default 'Servicio gratis',
  stamps_required int not null default 8 check (stamps_required between 3 and 20),
  ticket_avg numeric not null default 150,
  inactive_days int not null default 21 check (inactive_days between 3 and 365),
  stamp_cooldown_min int not null default 30,
  lat double precision,
  lng double precision,
  address text,
  plan text not null default 'trial',
  trial_ends_at timestamptz not null default now() + interval '14 days',
  pin_failures int not null default 0,
  pin_locked_until timestamptz,
  login_failures int not null default 0,
  login_locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.mk_sessions (
  token_hash text primary key,
  merchant_id uuid not null references public.mk_merchants(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  staff_name text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.mk_customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.mk_merchants(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  marketing_opt_in boolean not null default false,
  serial text unique not null,
  auth_token text not null,
  stamps int not null default 0,
  rewards_available int not null default 0,
  rewards_redeemed int not null default 0,
  total_visits int not null default 0,
  last_visit_at timestamptz,
  last_message text,
  last_message_at timestamptz,
  google_object_saved boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (merchant_id, phone)
);
create index mk_customers_merchant_last_visit on public.mk_customers (merchant_id, last_visit_at);

create table public.mk_events (
  id bigserial primary key,
  merchant_id uuid not null references public.mk_merchants(id) on delete cascade,
  customer_id uuid references public.mk_customers(id) on delete cascade,
  kind text not null check (kind in ('join','stamp','redeem','campaign')),
  staff_name text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index mk_events_merchant_created on public.mk_events (merchant_id, created_at desc);
create index mk_events_customer on public.mk_events (customer_id, created_at desc);

create table public.mk_campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.mk_merchants(id) on delete cascade,
  segment text not null,
  message text not null,
  recipients int not null default 0,
  created_at timestamptz not null default now()
);

create table public.mk_apple_registrations (
  device_library_id text not null,
  serial text not null references public.mk_customers(serial) on delete cascade,
  push_token text not null,
  created_at timestamptz not null default now(),
  primary key (device_library_id, serial)
);

-- Todo el acceso pasa por la Edge Function (service role). RLS activo sin políticas = sin acceso público directo.
alter table public.mk_merchants enable row level security;
alter table public.mk_sessions enable row level security;
alter table public.mk_customers enable row level security;
alter table public.mk_events enable row level security;
alter table public.mk_campaigns enable row level security;
alter table public.mk_apple_registrations enable row level security;
