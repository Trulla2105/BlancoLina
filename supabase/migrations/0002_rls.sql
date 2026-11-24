-- Hogar Lina — permisos (RLS).
-- El catálogo es público (precios incluidos). Los pedidos, arrepentimientos
-- y suscripciones NO se insertan desde el cliente: entran por funciones
-- security definer (0003) que validan y calculan todo del lado de la base.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

alter table public.admin_users      enable row level security;
alter table public.categories       enable row level security;
alter table public.lineas           enable row level security;
alter table public.products         enable row level security;
alter table public.product_colors   enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.hero_banners     enable row level security;
alter table public.site_settings    enable row level security;
alter table public.palette_colors   enable row level security;
alter table public.instagram_posts  enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.arrepentimientos enable row level security;
alter table public.newsletter       enable row level security;

-- admin_users: cada uno ve solo su fila (el chequeo real es is_admin()).
create policy "admin lee su fila" on public.admin_users
  for select using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Catálogo: lectura pública de lo activo, escritura solo admin
-- ---------------------------------------------------------------------------
create policy "categorías públicas" on public.categories for select using (true);
create policy "líneas públicas"     on public.lineas     for select using (true);

create policy "productos activos públicos" on public.products
  for select using (activo or public.is_admin());

create policy "colores de productos activos" on public.product_colors
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p where p.id = product_id and p.activo
    )
  );
create policy "variantes de productos activos" on public.product_variants
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p where p.id = product_id and p.activo
    )
  );
create policy "imágenes de productos activos" on public.product_images
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p where p.id = product_id and p.activo
    )
  );

create policy "banners activos públicos" on public.hero_banners
  for select using (activo or public.is_admin());
create policy "configuración pública" on public.site_settings for select using (true);
create policy "paleta pública"        on public.palette_colors for select using (true);
create policy "instagram público"     on public.instagram_posts for select using (true);

create policy "admin gestiona categorías" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona líneas" on public.lineas
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona productos" on public.products
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona colores" on public.product_colors
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona variantes" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona imágenes" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona banners" on public.hero_banners
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona configuración" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona paleta" on public.palette_colors
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gestiona instagram" on public.instagram_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Pedidos y formularios: solo el admin lee y modifica.
-- Sin policy de insert: el público solo puede crear vía las funciones de 0003.
-- ---------------------------------------------------------------------------
create policy "admin lee pedidos" on public.orders
  for select using (public.is_admin());
create policy "admin actualiza pedidos" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admin lee ítems" on public.order_items
  for select using (public.is_admin());

create policy "admin lee arrepentimientos" on public.arrepentimientos
  for select using (public.is_admin());
create policy "admin actualiza arrepentimientos" on public.arrepentimientos
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admin lee newsletter" on public.newsletter
  for select using (public.is_admin());
create policy "admin borra newsletter" on public.newsletter
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: fotos de productos y banners (lectura pública, escritura admin)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "admin sube imágenes" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin actualiza imágenes" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
create policy "admin borra imágenes" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());
