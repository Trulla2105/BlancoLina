-- Hogar Lina — permisos explícitos sobre tablas y funciones.
--
-- Los proyectos de Supabase creados con la exposición automática apagada no
-- dan permisos sobre las tablas nuevas a anon/authenticated: el sitio no
-- podía leer el catálogo aunque RLS lo permitiera (has_table_privilege daba
-- false). Acá se otorga lo mínimo; RLS (0002) sigue decidiendo qué filas.
-- Idempotente: se puede correr sobre una base que ya tenga estos permisos.

do $$
begin
  if not (exists (select 1 from pg_roles where rolname = 'anon')
          and exists (select 1 from pg_roles where rolname = 'authenticated')
          and exists (select 1 from pg_roles where rolname = 'service_role')) then
    return; -- fuera de Supabase (Postgres local de prueba)
  end if;

  grant usage on schema public to anon, authenticated, service_role;

  -- Catálogo y contenido: lectura pública; escritura para usuarios logueados
  -- (RLS la limita a los admins).
  grant select on
    public.categories, public.lineas, public.products, public.product_colors,
    public.product_variants, public.product_images, public.hero_banners,
    public.site_settings, public.palette_colors, public.instagram_posts
  to anon, authenticated;
  grant insert, update, delete on
    public.categories, public.lineas, public.products, public.product_colors,
    public.product_variants, public.product_images, public.hero_banners,
    public.site_settings, public.palette_colors, public.instagram_posts
  to authenticated;

  -- Panel (RLS: solo admins). El público no toca estas tablas directo:
  -- pedidos, arrepentimientos y newsletter entran por funciones (0003).
  grant select on public.admin_users to authenticated;
  grant select, update on public.orders to authenticated;
  grant select on public.order_items to authenticated;
  grant select, update on public.arrepentimientos to authenticated;
  grant select, delete on public.newsletter to authenticated;

  -- Servidor (webhook de Mercado Pago con la service role key).
  grant all on all tables in schema public to service_role;
  grant all on all sequences in schema public to service_role;

  -- Funciones que usan las policies de RLS o llama el sitio.
  grant execute on function public.is_admin() to anon, authenticated, service_role;
  grant execute on function public.config_comercial() to anon, authenticated;
  grant execute on function public.crear_pedido(jsonb, jsonb, jsonb, text) to anon, authenticated;
  grant execute on function public.ver_pedido(uuid) to anon, authenticated;
  grant execute on function public.registrar_preferencia_mp(uuid, text) to anon, authenticated;
  grant execute on function public.solicitar_arrepentimiento(jsonb) to anon, authenticated;
  grant execute on function public.suscribir_newsletter(text) to anon, authenticated;
  grant execute on function public.productos_mas_vendidos(int) to anon, authenticated;
end $$;

notify pgrst, 'reload schema';
