-- Mr Key pasa a ser la lealtad de Rojo 87 (luz 5, Regreso).
-- Las 3 migraciones anteriores (mk_*) se dejan tal cual: son el historial que ya se aplicó en
-- "LukOffMon's Project". Esta renombra tablas, índices y tareas, y apunta pg_cron a la nueva
-- Edge Function `rojo87`. Al aplicarla no había negocios ni clientes (solo ajustes y la clave admin).

alter table public.mk_merchants rename to r87_merchants;
alter table public.mk_sessions rename to r87_sessions;
alter table public.mk_customers rename to r87_customers;
alter table public.mk_events rename to r87_events;
alter table public.mk_campaigns rename to r87_campaigns;
alter table public.mk_apple_registrations rename to r87_apple_registrations;
alter table public.mk_payments rename to r87_payments;
alter table public.mk_settings rename to r87_settings;
alter table public.mk_admin_sessions rename to r87_admin_sessions;

alter index public.mk_customers_merchant_last_visit rename to r87_customers_merchant_last_visit;
alter index public.mk_events_merchant_created rename to r87_events_merchant_created;
alter index public.mk_events_customer rename to r87_events_customer;
alter index public.mk_payments_merchant rename to r87_payments_merchant;

-- La migración de diseño de Mr Key (20261029) nunca se aplicó en la base real: se completa aquí.
alter table public.r87_merchants
  add column if not exists design jsonb not null default '{}'::jsonb,
  add column if not exists nearby text not null default 'inactive' check (nearby in ('all', 'inactive', 'off'));
insert into public.r87_settings (key, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;
create extension if not exists pg_net;

-- Planes de Rojo 87 (ver supabase/functions/rojo87/admin.ts → PLANS).
update public.r87_merchants set plan = 'completo' where plan in ('emprendedor', 'pro');
update public.r87_merchants set plan = 'cadena' where plan = 'franquicias';
update public.r87_payments set plan = 'completo' where plan in ('emprendedor', 'pro');
update public.r87_payments set plan = 'cadena' where plan = 'franquicias';

-- Tareas programadas con los nombres y la URL nuevos.
select cron.unschedule(jobid) from cron.job where jobname in ('mrkey-borrar-pendientes', 'mrkey-avisar-inactivos');

select cron.schedule('rojo87-borrar-pendientes', '*/10 * * * *',
  $$delete from public.r87_merchants where status = 'pending' and pending_since < now() - interval '12 hours'$$);

select cron.schedule('rojo87-avisar-inactivos', '7 15 * * *', $$
  select net.http_post(
    url := 'https://lsvyryanshcuysowlysp.supabase.co/functions/v1/rojo87/api/cron/inactive',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select value from public.r87_settings where key = 'cron_secret')),
    body := '{}'::jsonb
  )
$$);
