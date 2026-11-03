-- Tabla de respuestas del cuestionario NutriConsumer (ya aplicada en Supabase).
create table public.encuesta_respuestas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  version smallint not null default 1,
  respuestas jsonb not null,
  puntaje smallint not null,
  perfil text not null,
  constraint respuestas_es_objeto check (jsonb_typeof(respuestas) = 'object'),
  constraint respuestas_tamano check (octet_length(respuestas::text) <= 4000),
  constraint puntaje_rango check (puntaje between 0 and 100),
  constraint perfil_valido check (perfil in ('consciente','equilibrio','riesgo'))
);
create index encuesta_respuestas_created_at_idx on public.encuesta_respuestas (created_at desc);

alter table public.encuesta_respuestas enable row level security;

-- Cualquiera puede enviar una respuesta (anónima) y ver los resultados; nadie puede editar ni borrar.
create policy "anon puede enviar respuestas" on public.encuesta_respuestas for insert to anon, authenticated
  with check (version = 1 and created_at between now() - interval '1 minute' and now() + interval '1 minute');
create policy "resultados publicos" on public.encuesta_respuestas for select to anon, authenticated using (true);
grant select, insert on public.encuesta_respuestas to anon, authenticated;
revoke update, delete, truncate on public.encuesta_respuestas from anon, authenticated;

-- Tiempo real
alter publication supabase_realtime add table public.encuesta_respuestas;
