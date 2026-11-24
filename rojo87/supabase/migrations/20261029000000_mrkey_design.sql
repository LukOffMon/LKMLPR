-- Diseño personalizable de la tarjeta, recordatorio por cercanía configurable
-- y aviso diario a las tarjetas de Apple Wallet de clientes que acaban de volverse inactivos.
alter table public.mk_merchants
  add column design jsonb not null default '{}'::jsonb,
  add column nearby text not null default 'inactive' check (nearby in ('all', 'inactive', 'off'));

-- Secreto con el que pg_cron llama a la Edge Function; nunca sale de la base de datos.
insert into public.mk_settings (key, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create extension if not exists pg_net;
select cron.schedule('mrkey-avisar-inactivos', '7 15 * * *', $$
  select net.http_post(
    url := 'https://lsvyryanshcuysowlysp.supabase.co/functions/v1/mrkey/api/cron/inactive',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select value from public.mk_settings where key = 'cron_secret')),
    body := '{}'::jsonb
  )
$$);
