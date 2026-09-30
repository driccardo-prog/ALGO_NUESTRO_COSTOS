-- ============================================================
-- Algo Nuestro · Actualización 2
-- Compras por mayor ("pagué X por N unidades, cada cartera usa M")
-- y fechas solo con mes.
--
-- Cómo usarlo: en Supabase → SQL Editor → New query, pegá TODO
-- este archivo y apretá "Run". Se puede correr más de una vez.
-- ============================================================

alter table public.gastos add column if not exists rinde numeric;
alter table public.gastos add column if not exists uso numeric;

alter table public.gastos drop constraint if exists gastos_modo_monto_check;
alter table public.gastos add constraint gastos_modo_monto_check
  check (modo_monto in ('total', 'por_rendimiento', 'unitario', 'por_unidad_tanda'));

-- Las cajas y bolsas cotizadas "por unidad" pasan a compra por mayor (1 por cartera).
update public.gastos
  set modo_monto = 'por_rendimiento', monto = precio_unitario, rinde = 1, uso = 1,
      precio_unitario = null, cantidad = null
  where modo_monto = 'por_unidad_tanda';

-- "Precio unitario × cantidad" pasa a compra por mayor: pagué precio × cantidad por
-- esa cantidad de unidades, una por cartera.
update public.gastos
  set modo_monto = 'por_rendimiento', monto = precio_unitario * cantidad, rinde = cantidad, uso = 1,
      precio_unitario = null, cantidad = null
  where modo_monto = 'unitario';

-- Fechas: solo el mes.
update public.gastos set fecha = date_trunc('month', fecha)::date where fecha is not null;
update public.tandas set fecha = date_trunc('month', fecha)::date where fecha is not null;
