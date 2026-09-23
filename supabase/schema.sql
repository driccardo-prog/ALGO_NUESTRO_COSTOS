-- ============================================================
-- Algo Nuestro · Sistema de costeo
-- Esquema de base de datos para Supabase.
--
-- Cómo usarlo: en Supabase, abrí "SQL Editor" → "New query",
-- pegá TODO este archivo y apretá "Run". Se puede correr más de
-- una vez sin romper nada.
--
-- Cada tabla tiene user_id y Row Level Security (RLS): cada
-- usuaria solo ve y modifica sus propios datos.
-- ============================================================

-- ---------- Categorías de gastos ----------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  es_cuero boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Productos (con ficha técnica) ----------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  codigo text not null,
  nombre text not null,
  tipologia text not null default '',
  es_subproducto boolean not null default false,
  ficha jsonb not null default '{}'::jsonb,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Tandas de producción ----------
create table if not exists public.tandas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  fecha date,
  estado text not null default 'planificada'
    check (estado in ('planificada', 'en_produccion', 'terminada')),
  -- unidades por producto: { "<producto_id>": 5, ... }
  unidades jsonb not null default '{}'::jsonb,
  notas text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Gastos ----------
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha date,
  descripcion text not null,
  categoria_id uuid references public.categorias (id) on delete set null,
  tipo text not null check (tipo in ('especifico', 'general', 'arranque', 'recurrente')),
  estado text not null default 'real' check (estado in ('real', 'estimado')),
  -- pendiente = todavía no se sabe el monto ("falta cargar")
  pendiente boolean not null default false,
  -- total: monto | unitario: precio_unitario × cantidad |
  -- por_unidad_tanda: precio_unitario × unidades de la tanda
  modo_monto text not null default 'total'
    check (modo_monto in ('total', 'unitario', 'por_unidad_tanda')),
  monto numeric,
  precio_unitario numeric,
  cantidad numeric,
  -- si es true, los montos se cargaron sin IVA y la app suma 21%
  sin_iva boolean not null default false,
  tanda_id uuid references public.tandas (id) on delete set null,
  -- productos a los que aplica (específico / arranque)
  productos jsonb not null default '[]'::jsonb,
  -- reparto personalizado en %: { "<producto_id>": 60, ... } o null
  reparto jsonb,
  -- solo recurrentes: mensual o anual (anual se prorratea a 12 meses)
  frecuencia text check (frecuencia in ('mensual', 'anual')),
  notas text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Configuración (una fila por usuaria) ----------
create table if not exists public.configuracion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['categorias', 'productos', 'tandas', 'gastos', 'configuracion'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "solo_duena" on public.%I', t);
    execute format(
      'create policy "solo_duena" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_idx', t);
  end loop;
end $$;

-- ---------- Fotos de productos (Storage) ----------
-- Bucket privado. Cada foto se guarda en "<user_id>/<producto_id>/<archivo>".
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "fotos_solo_duena" on storage.objects;
create policy "fotos_solo_duena" on storage.objects for all to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
