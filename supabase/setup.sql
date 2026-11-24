-- Hogar Lina — setup completo: todas las migraciones + datos de ejemplo.
-- Pegar entero en el SQL Editor de Supabase y ejecutar una sola vez.
-- Archivo generado: si cambia una migración, regenerarlo (docs/puesta-en-marcha.md).

-- >>> supabase/migrations/0001_esquema.sql
-- Hogar Lina — esquema inicial (tienda minorista de blanquería).
-- Catálogo con precios públicos, pedidos de invitado y configuración
-- comercial editable desde el panel.

-- ---------------------------------------------------------------------------
-- Admins del panel
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

-- Tipo de producto: Juegos de toalla y toallón, Toallones, Batas…
create table public.categories (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug   text not null unique,
  imagen text,                      -- foto de la tarjeta "Comprá por categoría"
  orden  int  not null default 0
);

-- Línea de calidad: Liviana (400 g), Pesada (500 g), Premium (560 g)…
create table public.lineas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  descripcion text,                 -- bajada del banner de la home
  imagen      text,
  orden       int  not null default 0
);

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  sku             text not null unique,
  slug            text not null unique,
  marca           text,
  category_id     uuid references public.categories (id) on delete set null,
  linea           text references public.lineas (slug) on update cascade on delete set null,
  descripcion     text,
  -- Cómo se llaman los dos ejes de variante en la ficha:
  -- "Color" / "Motivo" y "Medida" / "Talle" / "Letra".
  etiqueta_color  text not null default 'Color',
  etiqueta_medida text not null default 'Medida',
  activo          boolean not null default true,
  destacado       boolean not null default false,
  ocultar_nuevo   boolean not null default false,
  -- Orden manual de la galería (más alto = más adelante).
  orden           bigint  not null default floor(extract(epoch from now()))::bigint,
  created_at      timestamptz not null default now()
);

create table public.product_colors (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  nombre     text not null,
  hex        text,                  -- chip de color
  foto       text,                  -- foto del color (si existe, reemplaza al chip)
  orden      int  not null default 0,
  unique (product_id, nombre)
);

-- Cada combinación color + medida es una variante con su precio y stock.
create table public.product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  color_id      uuid not null references public.product_colors (id) on delete cascade,
  medida        text not null default 'Única',
  precio        numeric(12,2) not null check (precio > 0),
  precio_oferta numeric(12,2) check (precio_oferta is null or (precio_oferta > 0 and precio_oferta < precio)),
  stock         int not null default 0 check (stock >= 0),
  created_at    timestamptz not null default now(),
  unique (color_id, medida)
);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url        text not null,         -- path en el bucket product-images, o /seed/… del repo
  orden      int  not null default 0
);

-- ---------------------------------------------------------------------------
-- Contenido del sitio
-- ---------------------------------------------------------------------------
create table public.hero_banners (
  id         uuid primary key default gen_random_uuid(),
  url        text not null,
  url_mobile text,
  titulo     text,
  subtitulo  text,
  boton      text,
  link       text,
  orden      int not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Configuración editable: 'comercial', 'contacto', 'transferencia', 'instagram_embed'.
create table public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Colores de la paleta del editor de productos.
create table public.palette_colors (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  hex    text not null,
  orden  int  not null default 0
);

create table public.instagram_posts (
  id         uuid primary key default gen_random_uuid(),
  imagen     text not null,
  link       text not null,
  orden      int  not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pedidos (compras de invitados: no hace falta cuenta)
-- ---------------------------------------------------------------------------
create type public.order_status as enum
  ('pendiente_pago', 'pagado', 'enviado', 'entregado', 'cancelado');

create sequence public.orders_numero_seq start 1001;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  numero           int  not null unique default nextval('public.orders_numero_seq'),
  -- Llave del link de seguimiento que recibe el cliente (/pedido/<token>).
  token            uuid not null unique default gen_random_uuid(),
  estado           public.order_status not null default 'pendiente_pago',
  metodo_pago      text not null check (metodo_pago in ('transferencia', 'mercadopago')),
  -- Cliente
  email            text not null,
  nombre           text not null,
  apellido         text not null,
  telefono         text not null,
  dni              text not null,
  -- Entrega
  entrega          text not null check (entrega in ('domicilio', 'retiro')),
  calle            text,
  altura           text,
  piso_depto       text,
  codigo_postal    text,
  localidad        text,
  provincia        text,
  notas            text,
  -- Importes (snapshot al momento de la compra)
  subtotal         numeric(12,2) not null,
  descuento_pct    int not null default 0,
  descuento        numeric(12,2) not null default 0,
  envio            numeric(12,2),          -- null = a coordinar con el cliente
  total            numeric(12,2) not null,
  -- Mercado Pago
  mp_preference_id text,
  mp_payment_id    text,
  mp_status        text,
  mp_status_detail text,
  pagado_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  product_variant_id uuid references public.product_variants (id) on delete set null,
  -- Snapshot: el pedido se sigue leyendo aunque el producto cambie o se borre.
  producto           text not null,
  sku                text not null,
  color              text not null,
  medida             text not null,
  cantidad           int  not null check (cantidad > 0),
  precio_unitario    numeric(12,2) not null
);

-- Botón de arrepentimiento (Res. 424/2020 de la Secretaría de Comercio Interior).
create table public.arrepentimientos (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique,
  numero_pedido  text,
  nombre         text not null,
  email          text not null,
  telefono       text,
  dni            text,
  motivo         text,
  atendido       boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.newsletter (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index idx_products_category on public.products (category_id) where activo;
create index idx_products_linea    on public.products (linea) where activo;
create index idx_products_orden    on public.products (orden desc);
create index idx_colors_product    on public.product_colors (product_id, orden);
create index idx_variants_product  on public.product_variants (product_id);
create index idx_variants_color    on public.product_variants (color_id);
create index idx_images_product    on public.product_images (product_id, orden);
create index idx_orders_estado     on public.orders (estado, created_at desc);
create index idx_order_items_order on public.order_items (order_id);

-- >>> supabase/migrations/0002_rls.sql
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

-- >>> supabase/migrations/0003_funciones.sql
-- Hogar Lina — funciones públicas (security definer) y reglas de pedidos.
--
-- El navegador nunca inserta pedidos directo: llama a crear_pedido(), que
-- toma los precios y el stock de la base (no del carrito), aplica el
-- descuento por transferencia y el envío gratis según la configuración
-- comercial, descuenta el stock y devuelve el link de seguimiento.

-- Configuración comercial con valores por defecto si falta algún campo.
create or replace function public.config_comercial()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
           'transferencia_pct', 0,
           'cuotas', 1,
           'envio_gratis_desde', null,
           'costo_envio', null,
           'retiro_habilitado', false,
           'retiro_direccion', ''
         )
         || coalesce((select value from public.site_settings where key = 'comercial'), '{}'::jsonb);
$$;

create or replace function public.crear_pedido(
  p_items   jsonb,   -- [{"variant_id": "<uuid>", "cantidad": 2}, …]
  p_cliente jsonb,   -- {email, nombre, apellido, telefono, dni}
  p_entrega jsonb,   -- {tipo: domicilio|retiro, calle, altura, piso_depto, codigo_postal, localidad, provincia, notas}
  p_metodo  text     -- transferencia | mercadopago
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_cfg       jsonb := public.config_comercial();
  v_email     text  := lower(btrim(coalesce(p_cliente->>'email', '')));
  v_nombre    text  := btrim(coalesce(p_cliente->>'nombre', ''));
  v_apellido  text  := btrim(coalesce(p_cliente->>'apellido', ''));
  v_telefono  text  := btrim(coalesce(p_cliente->>'telefono', ''));
  v_dni       text  := regexp_replace(coalesce(p_cliente->>'dni', ''), '[^0-9]', '', 'g');
  v_entrega   text  := coalesce(p_entrega->>'tipo', 'domicilio');
  v_subtotal  numeric(12,2) := 0;
  v_pct       int := 0;
  v_descuento numeric(12,2) := 0;
  v_gratis    numeric;
  v_envio     numeric(12,2);
  v_total     numeric(12,2);
  v_order_id  uuid;
  v_numero    int;
  v_token     uuid;
  r           record;
  v           record;
begin
  -- Validaciones -------------------------------------------------------------
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío.';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'El carrito tiene demasiados productos.';
  end if;
  if p_metodo is null or p_metodo not in ('transferencia', 'mercadopago') then
    raise exception 'Elegí un medio de pago válido.';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 200 then
    raise exception 'Revisá el email.';
  end if;
  if v_nombre = '' or v_apellido = '' or length(v_nombre) > 100 or length(v_apellido) > 100 then
    raise exception 'Completá nombre y apellido.';
  end if;
  if length(regexp_replace(v_telefono, '[^0-9]', '', 'g')) < 8 or length(v_telefono) > 40 then
    raise exception 'Revisá el teléfono (con código de área).';
  end if;
  if length(v_dni) < 7 or length(v_dni) > 11 then
    raise exception 'Revisá el DNI o CUIT.';
  end if;
  if v_entrega not in ('domicilio', 'retiro') then
    raise exception 'Elegí cómo querés recibir el pedido.';
  end if;
  if v_entrega = 'retiro' and not coalesce((v_cfg->>'retiro_habilitado')::boolean, false) then
    raise exception 'El retiro en el local no está disponible.';
  end if;
  if v_entrega = 'domicilio' and (
       btrim(coalesce(p_entrega->>'calle', '')) = ''
    or btrim(coalesce(p_entrega->>'altura', '')) = ''
    or btrim(coalesce(p_entrega->>'codigo_postal', '')) = ''
    or btrim(coalesce(p_entrega->>'localidad', '')) = ''
    or btrim(coalesce(p_entrega->>'provincia', '')) = '') then
    raise exception 'Completá la dirección de entrega.';
  end if;

  -- Precio y stock desde la base, con la fila bloqueada hasta el commit -----
  for r in
    select x.variant_id, sum(x.cantidad)::int as cantidad
    from jsonb_to_recordset(p_items) as x(variant_id uuid, cantidad int)
    group by x.variant_id
    order by x.variant_id
  loop
    if r.variant_id is null or r.cantidad is null or r.cantidad < 1 or r.cantidad > 99 then
      raise exception 'Revisá las cantidades del carrito.';
    end if;

    select pv.precio, pv.precio_oferta, pv.stock, pv.medida,
           p.activo, p.nombre, pc.nombre as color
      into v
    from public.product_variants pv
    join public.products p        on p.id = pv.product_id
    join public.product_colors pc on pc.id = pv.color_id
    where pv.id = r.variant_id
    for update of pv;

    if not found or not v.activo then
      raise exception 'Un producto del carrito ya no está disponible. Actualizá el carrito.';
    end if;
    if v.stock < r.cantidad then
      if v.stock = 0 then
        raise exception 'Se agotó % (%, %). Sacalo del carrito para seguir.', v.nombre, v.color, v.medida;
      end if;
      raise exception 'De % (%, %) quedan % unidades.', v.nombre, v.color, v.medida, v.stock;
    end if;

    v_subtotal := v_subtotal + coalesce(v.precio_oferta, v.precio) * r.cantidad;
  end loop;

  -- Descuento por transferencia y envío -----------------------------------
  if p_metodo = 'transferencia' then
    v_pct := greatest(0, least(100, coalesce((v_cfg->>'transferencia_pct')::int, 0)));
  end if;
  v_descuento := round(v_subtotal * v_pct / 100.0);

  v_gratis := nullif(v_cfg->>'envio_gratis_desde', '')::numeric;
  if v_entrega = 'retiro' then
    v_envio := 0;
  elsif v_gratis is not null and v_subtotal >= v_gratis then
    v_envio := 0;
  else
    v_envio := nullif(v_cfg->>'costo_envio', '')::numeric;   -- null = a coordinar
  end if;
  v_total := v_subtotal - v_descuento + coalesce(v_envio, 0);

  insert into public.orders (
    metodo_pago, email, nombre, apellido, telefono, dni,
    entrega, calle, altura, piso_depto, codigo_postal, localidad, provincia, notas,
    subtotal, descuento_pct, descuento, envio, total
  ) values (
    p_metodo, v_email, left(v_nombre, 100), left(v_apellido, 100), left(v_telefono, 40), v_dni,
    v_entrega,
    left(nullif(btrim(p_entrega->>'calle'), ''), 120),
    left(nullif(btrim(p_entrega->>'altura'), ''), 20),
    left(nullif(btrim(p_entrega->>'piso_depto'), ''), 40),
    left(nullif(btrim(p_entrega->>'codigo_postal'), ''), 12),
    left(nullif(btrim(p_entrega->>'localidad'), ''), 80),
    left(nullif(btrim(p_entrega->>'provincia'), ''), 60),
    left(nullif(btrim(p_entrega->>'notas'), ''), 500),
    v_subtotal, v_pct, v_descuento, v_envio, v_total
  )
  returning id, numero, token into v_order_id, v_numero, v_token;

  insert into public.order_items
    (order_id, product_variant_id, producto, sku, color, medida, cantidad, precio_unitario)
  select v_order_id, pv.id, p.nombre, p.sku, pc.nombre, pv.medida, l.cantidad,
         coalesce(pv.precio_oferta, pv.precio)
  from (
    select x.variant_id, sum(x.cantidad)::int as cantidad
    from jsonb_to_recordset(p_items) as x(variant_id uuid, cantidad int)
    group by x.variant_id
  ) l
  join public.product_variants pv on pv.id = l.variant_id
  join public.product_colors pc   on pc.id = pv.color_id
  join public.products p          on p.id = pv.product_id;

  update public.product_variants pv
  set stock = pv.stock - l.cantidad
  from (
    select x.variant_id, sum(x.cantidad)::int as cantidad
    from jsonb_to_recordset(p_items) as x(variant_id uuid, cantidad int)
    group by x.variant_id
  ) l
  where pv.id = l.variant_id;

  return jsonb_build_object(
    'token', v_token,
    'numero', v_numero,
    'total', v_total,
    'metodo_pago', p_metodo
  );
end;
$$;

-- Lo que ve el cliente en /pedido/<token> (el token no se puede adivinar).
create or replace function public.ver_pedido(p_token uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'numero', o.numero,
    'token', o.token,
    'estado', o.estado,
    'metodo_pago', o.metodo_pago,
    'created_at', o.created_at,
    'email', o.email,
    'nombre', o.nombre,
    'apellido', o.apellido,
    'telefono', o.telefono,
    'entrega', o.entrega,
    'calle', o.calle,
    'altura', o.altura,
    'piso_depto', o.piso_depto,
    'codigo_postal', o.codigo_postal,
    'localidad', o.localidad,
    'provincia', o.provincia,
    'subtotal', o.subtotal,
    'descuento_pct', o.descuento_pct,
    'descuento', o.descuento,
    'envio', o.envio,
    'total', o.total,
    'mp_status', o.mp_status,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'producto', i.producto,
               'sku', i.sku,
               'color', i.color,
               'medida', i.medida,
               'cantidad', i.cantidad,
               'precio_unitario', i.precio_unitario
             ) order by i.producto, i.color, i.medida), '[]'::jsonb)
      from public.order_items i
      where i.order_id = o.id
    )
  )
  from public.orders o
  where o.token = p_token;
$$;

-- Guarda la preferencia de Mercado Pago creada por el servidor (se puede
-- reintentar mientras el pedido siga pendiente de pago).
create or replace function public.registrar_preferencia_mp(p_token uuid, p_preference_id text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  update public.orders
  set mp_preference_id = left(p_preference_id, 120)
  where token = p_token
    and metodo_pago = 'mercadopago'
    and estado = 'pendiente_pago';
  return found;
end;
$$;

-- Botón de arrepentimiento: registra el pedido y devuelve el código.
create or replace function public.solicitar_arrepentimiento(p_datos jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(p_datos->>'nombre', ''));
  v_email  text := lower(btrim(coalesce(p_datos->>'email', '')));
  v_codigo text := 'ARR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
begin
  if v_nombre = '' or length(v_nombre) > 120 then
    raise exception 'Completá tu nombre.';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 200 then
    raise exception 'Revisá el email.';
  end if;

  insert into public.arrepentimientos (codigo, numero_pedido, nombre, email, telefono, dni, motivo)
  values (
    v_codigo,
    left(nullif(btrim(p_datos->>'numero_pedido'), ''), 40),
    v_nombre,
    v_email,
    left(nullif(btrim(p_datos->>'telefono'), ''), 40),
    left(nullif(btrim(p_datos->>'dni'), ''), 20),
    left(nullif(btrim(p_datos->>'motivo'), ''), 1000)
  );
  return v_codigo;
end;
$$;

create or replace function public.suscribir_newsletter(p_email text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 200 then
    raise exception 'Revisá el email.';
  end if;
  insert into public.newsletter (email) values (v_email) on conflict (email) do nothing;
end;
$$;

-- Productos más vendidos (unidades en pedidos cobrados). Devuelve solo los
-- ids en orden, sin las cantidades: el volumen de ventas no es público.
create or replace function public.productos_mas_vendidos(p_limit int default 12)
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select pv.product_id
  from public.order_items i
  join public.orders o            on o.id = i.order_id
  join public.product_variants pv on pv.id = i.product_variant_id
  join public.products p          on p.id = pv.product_id and p.activo
  where o.estado in ('pagado', 'enviado', 'entregado')
  group by pv.product_id
  order by sum(i.cantidad) desc, pv.product_id
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

-- Al cancelar un pedido vuelve el stock; un cancelado no se reactiva.
create or replace function public.orders_antes_de_actualizar()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.estado = 'cancelado' and new.estado <> 'cancelado' then
    raise exception 'Un pedido cancelado no se puede reactivar.';
  end if;
  if new.estado = 'cancelado' and old.estado <> 'cancelado' then
    update public.product_variants pv
    set stock = pv.stock + i.cantidad
    from public.order_items i
    where i.order_id = new.id and i.product_variant_id = pv.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_antes_de_actualizar
  before update on public.orders
  for each row execute function public.orders_antes_de_actualizar();

-- Permisos de ejecución explícitos. Los roles anon/authenticated son de
-- Supabase: fuera de Supabase (Postgres local de prueba) se saltea.
revoke execute on function public.orders_antes_de_actualizar() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.config_comercial() to anon, authenticated;
    grant execute on function public.crear_pedido(jsonb, jsonb, jsonb, text) to anon, authenticated;
    grant execute on function public.ver_pedido(uuid) to anon, authenticated;
    grant execute on function public.registrar_preferencia_mp(uuid, text) to anon, authenticated;
    grant execute on function public.solicitar_arrepentimiento(jsonb) to anon, authenticated;
    grant execute on function public.suscribir_newsletter(text) to anon, authenticated;
    grant execute on function public.productos_mas_vendidos(int) to anon, authenticated;
  end if;
end $$;

-- >>> supabase/migrations/0004_permisos.sql
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

-- >>> supabase/seed.sql
-- Hogar Lina — datos de ejemplo: 10 productos de Franco Valente (lista del 13/10/2026).
-- Precio de venta = precio de lista sin IVA × 1,21 (IVA) × 1,5 (margen 50%), redondeado
-- hacia arriba a los $100. Stock de ejemplo. Las fotos salen del catálogo 2026 y viven
-- en public/seed/ del repositorio (no hace falta subirlas a Storage).
-- Correrlo una vez al armar la base. Si se vuelve a correr, restablece estos 10
-- productos tal como están acá (precios, stock y fotos) y pisa lo editado en el panel.

begin;

delete from public.products where sku in ('FV-250', 'FV-251', 'FV-252', 'FV-240', 'FV-290', 'FV-540', 'FV-111', 'FV-2001', 'FV-3004', 'FV-300');

-- Categorías
insert into public.categories (id, nombre, slug, imagen, orden) values ('6a6727c2-ff37-53cd-adb5-f90ac9deb35c', 'Juegos de toalla y toallón', 'juegos-de-toalla-y-toallon', '/seed/categorias/juegos.webp', 1)
  on conflict (slug) do update set nombre = excluded.nombre, imagen = excluded.imagen, orden = excluded.orden;
insert into public.categories (id, nombre, slug, imagen, orden) values ('8a3064d9-946c-56aa-9581-b5db0232c683', 'Toallones', 'toallones', '/seed/categorias/toallones.webp', 2)
  on conflict (slug) do update set nombre = excluded.nombre, imagen = excluded.imagen, orden = excluded.orden;
insert into public.categories (id, nombre, slug, imagen, orden) values ('83dffd3b-364e-5011-8b1f-def4ee077774', 'Toallas de visita', 'toallas-de-visita', '/seed/categorias/toallas-de-visita.webp', 3)
  on conflict (slug) do update set nombre = excluded.nombre, imagen = excluded.imagen, orden = excluded.orden;
insert into public.categories (id, nombre, slug, imagen, orden) values ('b602ec5e-3f42-598c-968b-e1be7e722d4d', 'Batas', 'batas', '/seed/categorias/batas.webp', 4)
  on conflict (slug) do update set nombre = excluded.nombre, imagen = excluded.imagen, orden = excluded.orden;
insert into public.categories (id, nombre, slug, imagen, orden) values ('d04167c8-c952-5e1f-bf33-64cfa4b92abc', 'Turbantes', 'turbantes', '/seed/categorias/turbantes.webp', 5)
  on conflict (slug) do update set nombre = excluded.nombre, imagen = excluded.imagen, orden = excluded.orden;
insert into public.categories (id, nombre, slug, imagen, orden) values ('dbdae2f2-2c98-5105-bc39-9d0d454f52de', 'Repasadores', 'repasadores', '/seed/categorias/repasadores.webp', 6)
  on conflict (slug) do update set nombre = excluded.nombre, imagen = excluded.imagen, orden = excluded.orden;

-- Líneas
insert into public.lineas (id, nombre, slug, descripcion, imagen, orden) values ('95a91023-2f43-5c2c-84d2-6f38b3bd3153', 'Línea Liviana', 'liviana', '400 g/m² · Para el uso de todos los días', '/seed/lineas/liviana.webp', 1)
  on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, imagen = excluded.imagen, orden = excluded.orden;
insert into public.lineas (id, nombre, slug, descripcion, imagen, orden) values ('87ae96f9-20cc-5ea3-bc4a-156302a94406', 'Línea Pesada', 'pesada', '500 g/m² · Más cuerpo y absorción', '/seed/lineas/pesada.webp', 2)
  on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, imagen = excluded.imagen, orden = excluded.orden;
insert into public.lineas (id, nombre, slug, descripcion, imagen, orden) values ('201546b8-86b4-59d7-8fe7-19943a18b255', 'Línea Premium', 'premium', '560 g/m² · King Size, la más suave', '/seed/lineas/premium.webp', 3)
  on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, imagen = excluded.imagen, orden = excluded.orden;

-- FV-250 · Juego de Toalla y Toallón Liviano 400 g · lista $12.215 → venta $22.200
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('9d890f14-db1e-5393-94ef-31824bb77254', 'Juego de Toalla y Toallón Liviano 400 g', 'FV-250', 'juego-toalla-y-toallon-liviano-400', 'Franco Valente', (select id from public.categories where slug = 'juegos-de-toalla-y-toallon'), 'liviana', 'Juego de toalla de rostro y toallón en rizo 100% algodón de 400 g/m², de la Línea Liviana de Franco Valente. Medidas de referencia: toalla 45 × 80 cm y toallón 70 × 140 cm. Suaves y absorbentes desde el primer uso. Los pesos y medidas son aproximados.', 'Color', 'Medida', true, true, 1800000000);
insert into public.product_images (id, product_id, url, orden) values ('968c30f2-33a1-5c89-9b70-d197d77fed35', '9d890f14-db1e-5393-94ef-31824bb77254', '/seed/productos/juego-rosa-tierra.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('4fb7d466-2537-5e20-ac31-1706d0031f42', '9d890f14-db1e-5393-94ef-31824bb77254', '/seed/productos/juego-blanco.webp', 1);
insert into public.product_images (id, product_id, url, orden) values ('e5cc243b-a6c2-51cf-9d68-faae7ccc0708', '9d890f14-db1e-5393-94ef-31824bb77254', '/seed/productos/liviana-faja.webp', 2);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('019d6b94-3817-5d10-9812-fc7f66d4301a', '9d890f14-db1e-5393-94ef-31824bb77254', 'Blanco', '#f5f4f1', '/seed/colores/blanco.webp', 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('bc1bf545-4e18-51a2-bf69-b728f5269e88', '9d890f14-db1e-5393-94ef-31824bb77254', '019d6b94-3817-5d10-9812-fc7f66d4301a', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('34dba482-93d4-5ec9-b479-d6de89aa3f5f', '9d890f14-db1e-5393-94ef-31824bb77254', 'Crudo', '#eae5da', '/seed/colores/crudo.webp', 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('02b67ebf-0885-5f7d-8766-b0b4f52b719c', '9d890f14-db1e-5393-94ef-31824bb77254', '34dba482-93d4-5ec9-b479-d6de89aa3f5f', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('0b7b6616-d308-5443-82db-04cf8641045f', '9d890f14-db1e-5393-94ef-31824bb77254', 'Cemento', '#c7c0b8', '/seed/colores/cemento.webp', 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('113a1c70-4ce7-5095-8c60-d2104df7523b', '9d890f14-db1e-5393-94ef-31824bb77254', '0b7b6616-d308-5443-82db-04cf8641045f', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('3c53f966-96cf-535c-a91d-fc6dd564eb4a', '9d890f14-db1e-5393-94ef-31824bb77254', 'Bordó', '#6a152b', '/seed/colores/bordo.webp', 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('7023fc15-2534-54f4-8525-5df03f9a0299', '9d890f14-db1e-5393-94ef-31824bb77254', '3c53f966-96cf-535c-a91d-fc6dd564eb4a', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('8d110cb3-2355-5b00-9c2b-3c34fba4d400', '9d890f14-db1e-5393-94ef-31824bb77254', 'Beige', '#e2d5c4', '/seed/colores/beige.webp', 4);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('56aa268d-1731-5525-8368-5f77cc2cb57e', '9d890f14-db1e-5393-94ef-31824bb77254', '8d110cb3-2355-5b00-9c2b-3c34fba4d400', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('b2c453c6-76d3-516b-9df7-96cb424e86c6', '9d890f14-db1e-5393-94ef-31824bb77254', 'Marino', '#1c3751', '/seed/colores/marino.webp', 5);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('5654f321-7879-546c-b30f-115495d95e96', '9d890f14-db1e-5393-94ef-31824bb77254', 'b2c453c6-76d3-516b-9df7-96cb424e86c6', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('c6ef56c2-c148-5823-b3c5-21571820b34d', '9d890f14-db1e-5393-94ef-31824bb77254', 'Negro', '#1d1b1f', '/seed/colores/negro.webp', 6);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('5e883da0-e836-5803-8cdf-5580c3d4cf2a', '9d890f14-db1e-5393-94ef-31824bb77254', 'c6ef56c2-c148-5823-b3c5-21571820b34d', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('c7a69eaa-683e-555d-9588-b24e8a1830d9', '9d890f14-db1e-5393-94ef-31824bb77254', 'Benetton', '#18bdab', '/seed/colores/benetton.webp', 7);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('2bf016a7-0b6c-5154-a45f-0a4badc22f7e', '9d890f14-db1e-5393-94ef-31824bb77254', 'c7a69eaa-683e-555d-9588-b24e8a1830d9', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('063e3328-9e57-5974-b0a3-0e6a90ce3774', '9d890f14-db1e-5393-94ef-31824bb77254', 'Hot Pink', '#ec3d75', '/seed/colores/hot-pink.webp', 8);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('ae01a725-12e1-534c-ad61-26b33db1bd49', '9d890f14-db1e-5393-94ef-31824bb77254', '063e3328-9e57-5974-b0a3-0e6a90ce3774', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('f4770db1-c8fa-5d6d-baf8-39ef469f8ce4', '9d890f14-db1e-5393-94ef-31824bb77254', 'Bermellón', '#d9233e', '/seed/colores/bermellon.webp', 9);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('3563cb6f-37d1-534f-bce3-4d6efb7a5b8a', '9d890f14-db1e-5393-94ef-31824bb77254', 'f4770db1-c8fa-5d6d-baf8-39ef469f8ce4', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('96d6fcf4-002b-5c47-bb27-2417cafafca1', '9d890f14-db1e-5393-94ef-31824bb77254', 'Uva', '#af84a7', '/seed/colores/uva.webp', 10);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('af2b65c5-815d-5afd-b384-c08936ea61c5', '9d890f14-db1e-5393-94ef-31824bb77254', '96d6fcf4-002b-5c47-bb27-2417cafafca1', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('6a73d685-0ab7-559c-b725-6dd5cdc43cef', '9d890f14-db1e-5393-94ef-31824bb77254', 'Coral', '#f45b57', '/seed/colores/coral.webp', 11);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('91157315-7a01-5f77-8367-b4f18cea8a56', '9d890f14-db1e-5393-94ef-31824bb77254', '6a73d685-0ab7-559c-b725-6dd5cdc43cef', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('73a43f5c-a2c8-5e1a-bbce-bae47113fe8d', '9d890f14-db1e-5393-94ef-31824bb77254', 'Francia', '#1f5dab', '/seed/colores/francia.webp', 12);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('a6c25dfc-1146-5ca1-af29-aec8f868f74b', '9d890f14-db1e-5393-94ef-31824bb77254', '73a43f5c-a2c8-5e1a-bbce-bae47113fe8d', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('12684d2d-a604-5cab-ae95-4008fac414e4', '9d890f14-db1e-5393-94ef-31824bb77254', 'Rojo Ladrillo', '#b55041', '/seed/colores/rojo-ladrillo.webp', 13);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('fab103d8-8e69-51db-aabb-69ef88ac6e02', '9d890f14-db1e-5393-94ef-31824bb77254', '12684d2d-a604-5cab-ae95-4008fac414e4', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('5a9e88f6-7a18-5b12-a343-2680f710ba02', '9d890f14-db1e-5393-94ef-31824bb77254', 'Celeste Polo', '#93b6df', '/seed/colores/celeste-polo.webp', 14);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('bd9479e0-99ce-521e-bb01-e2f23f938121', '9d890f14-db1e-5393-94ef-31824bb77254', '5a9e88f6-7a18-5b12-a343-2680f710ba02', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('f6a3bd55-70b1-571d-8ec3-ffef75ca8af6', '9d890f14-db1e-5393-94ef-31824bb77254', 'Rosa Tierra', '#cc9998', '/seed/colores/rosa-tierra.webp', 15);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('ef8d5b87-3b3b-54e3-8758-e5e6ed7a9317', '9d890f14-db1e-5393-94ef-31824bb77254', 'f6a3bd55-70b1-571d-8ec3-ffef75ca8af6', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('bc28b99c-8a8c-5b53-98ce-5f58052e2f34', '9d890f14-db1e-5393-94ef-31824bb77254', 'Verde Inglés', '#455954', '/seed/colores/verde-ingles.webp', 16);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('d6039f37-e0d9-5bd9-a1d3-cc859ef3c64d', '9d890f14-db1e-5393-94ef-31824bb77254', 'bc28b99c-8a8c-5b53-98ce-5f58052e2f34', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('96583cc6-236a-5d56-9e48-9365b1bfdd05', '9d890f14-db1e-5393-94ef-31824bb77254', 'Gris Oscuro', '#aaa3a1', '/seed/colores/gris-oscuro.webp', 17);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('81cb35f0-ca24-5133-b74e-c45ee6bbf1ec', '9d890f14-db1e-5393-94ef-31824bb77254', '96583cc6-236a-5d56-9e48-9365b1bfdd05', 'Única', 22200, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('33e133af-8e72-5ef1-85c7-6c7ca85257ba', '9d890f14-db1e-5393-94ef-31824bb77254', 'Gris Plata', '#bbb4b4', null, 18);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('ff41d7b0-fccd-5547-abca-5c05cef4f4b2', '9d890f14-db1e-5393-94ef-31824bb77254', '33e133af-8e72-5ef1-85c7-6c7ca85257ba', 'Única', 22200, 8);

-- FV-251 · Juego de Toalla y Toallón Pesado 500 g · lista $16.774 → venta $30.500
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Juego de Toalla y Toallón Pesado 500 g', 'FV-251', 'juego-toalla-y-toallon-pesado-500', 'Franco Valente', (select id from public.categories where slug = 'juegos-de-toalla-y-toallon'), 'pesada', 'Juego de toalla de rostro y toallón en rizo 100% algodón de 500 g/m², de la Línea Pesada de Franco Valente: más cuerpo y más absorción. Medidas de referencia: toalla 45 × 85 cm y toallón 80 × 150 cm. Los pesos y medidas son aproximados.', 'Color', 'Medida', true, true, 1799999999);
insert into public.product_images (id, product_id, url, orden) values ('edeadc8f-57af-5976-9c19-b2d0451bc1cc', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '/seed/productos/juego-verde-ingles.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('3c08a68e-ff38-5333-a7d1-e7c19fe2ea22', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '/seed/productos/juego-blanco.webp', 1);
insert into public.product_images (id, product_id, url, orden) values ('dccd83d6-f1f2-5aa3-8020-434993d398cb', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '/seed/productos/pesada-faja.webp', 2);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('63e24957-54ad-56ca-aa19-a670a4d3809a', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Blanco', '#f5f4f1', '/seed/colores/blanco.webp', 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('3c0fa88d-ce40-5b8a-824b-cb740e2ed01b', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '63e24957-54ad-56ca-aa19-a670a4d3809a', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('043932f5-beac-50ba-b792-f428fad5e5da', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Crudo', '#eae5da', '/seed/colores/crudo.webp', 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('fa22364a-d204-5611-8f8f-a37b4403b0b1', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '043932f5-beac-50ba-b792-f428fad5e5da', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('266d3e09-d43d-5084-8c5b-1b1c40223cad', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Cemento', '#c7c0b8', '/seed/colores/cemento.webp', 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('c296152b-ccad-559d-a447-25e0dce73489', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '266d3e09-d43d-5084-8c5b-1b1c40223cad', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('59f8a7f2-7570-53f7-b0ae-b4ad24c83ef8', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Bordó', '#6a152b', '/seed/colores/bordo.webp', 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('67d4427f-605a-54b0-bf28-e8d89eee60d6', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '59f8a7f2-7570-53f7-b0ae-b4ad24c83ef8', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('26b1222d-2693-5ce5-89e8-2879d3fc53aa', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Beige', '#e2d5c4', '/seed/colores/beige.webp', 4);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('d9725df1-dcfe-5f3d-89c2-0c491c004ed5', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '26b1222d-2693-5ce5-89e8-2879d3fc53aa', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('42dd5605-4835-5529-8185-0a664fd64847', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Marino', '#1c3751', '/seed/colores/marino.webp', 5);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('65b22ec3-20cf-5fdf-bd29-56d0d58b23e5', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '42dd5605-4835-5529-8185-0a664fd64847', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('561a85eb-2543-5719-bd24-def86fe16b10', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Negro', '#1d1b1f', '/seed/colores/negro.webp', 6);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('38b21d7a-048e-5628-bd40-50de23f6d7db', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '561a85eb-2543-5719-bd24-def86fe16b10', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('5b2309f7-1fa9-5e08-acfd-f82acc0d5cf4', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Benetton', '#18bdab', '/seed/colores/benetton.webp', 7);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('e64b0ff4-2525-5a2c-b73e-9820a16b0795', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '5b2309f7-1fa9-5e08-acfd-f82acc0d5cf4', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('3e1e2dc8-b684-5e0d-bc45-10650253f00c', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Hot Pink', '#ec3d75', '/seed/colores/hot-pink.webp', 8);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('9c8c3cd2-ba34-5700-9ad3-a3bc5eed204c', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '3e1e2dc8-b684-5e0d-bc45-10650253f00c', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('695c721c-febd-5910-953c-4f088e3bf2ba', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Bermellón', '#d9233e', '/seed/colores/bermellon.webp', 9);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('78c001ef-e827-558b-a9a9-d7147965ab7f', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '695c721c-febd-5910-953c-4f088e3bf2ba', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('70e5eb50-86dc-5d04-867a-931c2e9accda', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Uva', '#af84a7', '/seed/colores/uva.webp', 10);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('84c0f6cd-68f2-5703-a3db-f3ac0bc7dab1', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '70e5eb50-86dc-5d04-867a-931c2e9accda', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('3ae88648-c6f7-5182-9c72-203653d5e042', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Coral', '#f45b57', '/seed/colores/coral.webp', 11);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('aeae66bc-110a-5e4d-856c-447320c6312c', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '3ae88648-c6f7-5182-9c72-203653d5e042', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('575e4d08-2329-5bc0-9108-ffaac28b337a', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Francia', '#1f5dab', '/seed/colores/francia.webp', 12);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('27b61553-248a-545f-a4a3-94d5e285d39f', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '575e4d08-2329-5bc0-9108-ffaac28b337a', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('31101631-1941-5c8e-962c-518e9d3210b6', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Rojo Ladrillo', '#b55041', '/seed/colores/rojo-ladrillo.webp', 13);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('9596d741-e92e-54d5-9973-4953326de697', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '31101631-1941-5c8e-962c-518e9d3210b6', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('1506c71f-3d5e-5a8b-82c3-fbc687dcf504', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Celeste Polo', '#93b6df', '/seed/colores/celeste-polo.webp', 14);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('045f3417-3c63-5029-ae46-8ba58b76d41a', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '1506c71f-3d5e-5a8b-82c3-fbc687dcf504', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('e7c15114-2d9d-5567-a235-6fcf846e37fa', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Rosa Tierra', '#cc9998', '/seed/colores/rosa-tierra.webp', 15);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('47994400-b728-5039-b2e0-3e4f7d6baed3', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'e7c15114-2d9d-5567-a235-6fcf846e37fa', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('dce77309-c5ec-5bb9-a593-06994bed79df', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Verde Inglés', '#455954', '/seed/colores/verde-ingles.webp', 16);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('0c1e148e-b97e-588b-8cc1-ff987157a5cd', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'dce77309-c5ec-5bb9-a593-06994bed79df', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('1a44642b-bb3e-5e5a-a57b-301ee4686ad7', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Gris Oscuro', '#aaa3a1', '/seed/colores/gris-oscuro.webp', 17);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('4e2481f1-b4d8-5f1e-ba2b-b7699042a723', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '1a44642b-bb3e-5e5a-a57b-301ee4686ad7', 'Única', 30500, 8);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('7e8b5de9-f71a-5221-bee7-8be28620d03f', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', 'Gris Plata', '#bbb4b4', null, 18);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('d68b0245-0a97-5c15-a638-a1995e6a37dd', 'dae3a722-1bfc-5619-b1ac-569d1b1c543f', '7e8b5de9-f71a-5221-bee7-8be28620d03f', 'Única', 30500, 8);

-- FV-252 · Juego de Toalla y Toallón Premium King Size 560 g · lista $22.792 → venta $41.400
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('9727ac83-b928-5bea-9ace-29e67ce37e61', 'Juego de Toalla y Toallón Premium King Size 560 g', 'FV-252', 'juego-toalla-y-toallon-premium-king-size-560', 'Franco Valente', (select id from public.categories where slug = 'juegos-de-toalla-y-toallon'), 'premium', 'Juego de toalla de rostro y toallón King Size en rizo 100% algodón de 560 g/m², la línea más pesada y suave de Franco Valente. Medidas de referencia: toalla 45 × 95 cm y toallón 95 × 150 cm. Los pesos y medidas son aproximados.', 'Color', 'Medida', true, true, 1799999998);
insert into public.product_images (id, product_id, url, orden) values ('5638b2cf-3425-595b-983b-280549212dec', '9727ac83-b928-5bea-9ace-29e67ce37e61', '/seed/productos/premium-juego.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('916e3969-e14a-508e-a131-2f833e143da2', '9727ac83-b928-5bea-9ace-29e67ce37e61', '/seed/productos/premium-faja.webp', 1);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('2093ffb5-ae5e-55f9-9c1d-39ce2dccdda6', '9727ac83-b928-5bea-9ace-29e67ce37e61', 'Blanco', '#f5f4f1', '/seed/colores/premium-blanco.webp', 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('a1e7d4af-263f-5827-b55c-fe3e112da457', '9727ac83-b928-5bea-9ace-29e67ce37e61', '2093ffb5-ae5e-55f9-9c1d-39ce2dccdda6', 'Única', 41400, 6);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('5ad7c015-3ca0-5add-a20c-54630a562032', '9727ac83-b928-5bea-9ace-29e67ce37e61', 'Cemento', '#c7c0b8', '/seed/colores/premium-cemento.webp', 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('e6df8b50-a755-5ceb-a9d6-b7b162b279c2', '9727ac83-b928-5bea-9ace-29e67ce37e61', '5ad7c015-3ca0-5add-a20c-54630a562032', 'Única', 41400, 6);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('98f68ca4-1d7f-5b7f-9d6d-a239342af56e', '9727ac83-b928-5bea-9ace-29e67ce37e61', 'Beige', '#e2d5c4', '/seed/colores/premium-beige.webp', 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('b44678c6-35f5-5e46-bc78-48a05b5c2f00', '9727ac83-b928-5bea-9ace-29e67ce37e61', '98f68ca4-1d7f-5b7f-9d6d-a239342af56e', 'Única', 41400, 6);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('b3e8c868-3cba-58d4-a67e-a59325e4ed36', '9727ac83-b928-5bea-9ace-29e67ce37e61', 'Gris Oscuro', '#aaa3a1', '/seed/colores/premium-gris-oscuro.webp', 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('71d27461-e01e-5ba3-92ac-a1158aa3576c', '9727ac83-b928-5bea-9ace-29e67ce37e61', 'b3e8c868-3cba-58d4-a67e-a59325e4ed36', 'Única', 41400, 6);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('6923ae0c-0cac-5760-a13b-3575263801c3', '9727ac83-b928-5bea-9ace-29e67ce37e61', 'Negro', '#1d1b1f', '/seed/colores/premium-negro.webp', 4);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('538bfb59-2b53-50a7-9237-6ab193611524', '9727ac83-b928-5bea-9ace-29e67ce37e61', '6923ae0c-0cac-5760-a13b-3575263801c3', 'Única', 41400, 6);

-- FV-240 · Toallón de Baño Pesado 80 × 150 cm · lista $12.083 → venta $22.000
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Toallón de Baño Pesado 80 × 150 cm', 'FV-240', 'toallon-de-bano-pesado-80x150', 'Franco Valente', (select id from public.categories where slug = 'toallones'), 'pesada', 'Toallón de baño en rizo 100% algodón de 500 g/m², Línea Pesada de Franco Valente. Medida: 80 × 150 cm. Los pesos y medidas son aproximados.', 'Color', 'Medida', true, false, 1799999997);
insert into public.product_images (id, product_id, url, orden) values ('d79bab6c-9582-5ab3-ad9b-a6ebc9f58ba9', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '/seed/productos/toallon-rojo-ladrillo.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('ceacf3f0-9482-5b39-8c3d-4d8f190dfa4c', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '/seed/productos/toallon-blanco.webp', 1);
insert into public.product_images (id, product_id, url, orden) values ('c71e75d3-bb68-5f1f-aca5-c259518a2063', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '/seed/productos/pesada-faja.webp', 2);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('5ccdddec-3092-5fe6-9847-c5fb409cf5dd', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Blanco', '#f5f4f1', '/seed/colores/blanco.webp', 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('5cd50b4d-fef3-5fd7-9eb4-814d744e3eb1', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '5ccdddec-3092-5fe6-9847-c5fb409cf5dd', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('69730a51-7ece-55ac-907d-5cd9085d87c0', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Crudo', '#eae5da', '/seed/colores/crudo.webp', 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('4185cbab-1fcc-5db7-ac82-94de26d24648', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '69730a51-7ece-55ac-907d-5cd9085d87c0', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('93956685-c2a0-5f88-ab0b-14544dea63fb', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Cemento', '#c7c0b8', '/seed/colores/cemento.webp', 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('4a3a18a4-3a53-51d7-9e9c-19bff794d5d2', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '93956685-c2a0-5f88-ab0b-14544dea63fb', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('05c92f08-6a01-5d87-a19f-944681a2516c', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Bordó', '#6a152b', '/seed/colores/bordo.webp', 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('be29e62e-24ec-568b-af68-aeedd95af19c', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '05c92f08-6a01-5d87-a19f-944681a2516c', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('0107a5cd-3c32-59a2-967a-a4576092a05c', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Beige', '#e2d5c4', '/seed/colores/beige.webp', 4);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('90c981c0-d0f2-5686-a184-04439c01bf9b', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '0107a5cd-3c32-59a2-967a-a4576092a05c', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('4f50f23d-5f2a-5b65-8651-d3f9d3de8e54', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Marino', '#1c3751', '/seed/colores/marino.webp', 5);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('acfed6df-fa42-5019-a6d5-da3ad49a0c1e', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '4f50f23d-5f2a-5b65-8651-d3f9d3de8e54', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('46f62c6c-02ab-5aad-93d7-c310d09be54e', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Negro', '#1d1b1f', '/seed/colores/negro.webp', 6);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('0bb166e0-3c25-54a6-8aea-c43a7556510e', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '46f62c6c-02ab-5aad-93d7-c310d09be54e', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('3d4cc541-1999-5f0f-8b3c-0e8b76e9ce93', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Benetton', '#18bdab', '/seed/colores/benetton.webp', 7);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('138d2d96-6367-54f6-92c9-008b257bffdf', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '3d4cc541-1999-5f0f-8b3c-0e8b76e9ce93', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('98495139-bb4c-5b81-b259-62f1b34c5e5c', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Hot Pink', '#ec3d75', '/seed/colores/hot-pink.webp', 8);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('c141dc24-552e-502e-8d35-505fb549f894', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '98495139-bb4c-5b81-b259-62f1b34c5e5c', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('da50c9d0-e66d-5a40-b3f4-c30626c5ff6d', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Bermellón', '#d9233e', '/seed/colores/bermellon.webp', 9);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('a4b2dda7-986e-51dc-94b3-93a1d25a9f58', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'da50c9d0-e66d-5a40-b3f4-c30626c5ff6d', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('d6b12592-9e35-5124-9843-5f069a8a3bb1', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Uva', '#af84a7', '/seed/colores/uva.webp', 10);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('f3015239-608b-54b9-9e79-03b30154884b', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'd6b12592-9e35-5124-9843-5f069a8a3bb1', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('55dd54f5-0664-5065-a40f-e181338fb565', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Coral', '#f45b57', '/seed/colores/coral.webp', 11);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('8dfb4375-58b6-5291-aa9f-a5a881aba69a', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '55dd54f5-0664-5065-a40f-e181338fb565', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('0fdcaef2-4e97-531d-be2a-ed621d209b66', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Francia', '#1f5dab', '/seed/colores/francia.webp', 12);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('4cb90e38-5da1-50b6-a75d-9076a7efee36', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '0fdcaef2-4e97-531d-be2a-ed621d209b66', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('9c74822b-5f4e-522e-9804-50b47be6c6b4', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Rojo Ladrillo', '#b55041', '/seed/colores/rojo-ladrillo.webp', 13);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('194c2056-1f28-5cb2-8a09-f0f97756efaa', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '9c74822b-5f4e-522e-9804-50b47be6c6b4', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('34d305c2-2c7b-5037-993f-b87e57371984', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Celeste Polo', '#93b6df', '/seed/colores/celeste-polo.webp', 14);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('8308895b-9d12-5ef2-8e8e-dbf48e350e9d', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '34d305c2-2c7b-5037-993f-b87e57371984', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('d54f8c48-1ee9-5a66-a06a-641585c7f228', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Rosa Tierra', '#cc9998', '/seed/colores/rosa-tierra.webp', 15);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('f0d8babf-6a22-5029-bf9d-e35ecc03217d', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'd54f8c48-1ee9-5a66-a06a-641585c7f228', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('4fb69f39-dc90-5f21-8c4a-477e853f4539', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Verde Inglés', '#455954', '/seed/colores/verde-ingles.webp', 16);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('d7a5ad92-37be-5d9c-a357-56a7c20be7da', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '4fb69f39-dc90-5f21-8c4a-477e853f4539', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('139c8236-788c-5cc9-ac9e-22cdbd1dc5a6', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Gris Oscuro', '#aaa3a1', '/seed/colores/gris-oscuro.webp', 17);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('56ac26b1-fbe2-59e9-84b7-5c55e013e537', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '139c8236-788c-5cc9-ac9e-22cdbd1dc5a6', 'Única', 22000, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('60546259-9279-5088-bf56-87a27c0f28ef', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', 'Gris Plata', '#bbb4b4', null, 18);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('af8e1dca-341e-5353-96af-95ff5b4a457a', '3eaba33d-ad2d-5d65-875f-5222fe9b6253', '60546259-9279-5088-bf56-87a27c0f28ef', 'Única', 22000, 10);

-- FV-290 · Toallón de Baño Premium King Size 95 × 150 cm · lista $16.712 → venta $30.400
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('570808f5-c041-52e2-9c2a-07522e4b5239', 'Toallón de Baño Premium King Size 95 × 150 cm', 'FV-290', 'toallon-de-bano-premium-king-size-95x150', 'Franco Valente', (select id from public.categories where slug = 'toallones'), 'premium', 'Toallón King Size en rizo 100% algodón de 560 g/m², Línea Premium de Franco Valente. Medida: 95 × 150 cm. Los pesos y medidas son aproximados.', 'Color', 'Medida', true, true, 1799999996);
insert into public.product_images (id, product_id, url, orden) values ('fe434bba-ed7f-5266-8518-0aaa3de4c89d', '570808f5-c041-52e2-9c2a-07522e4b5239', '/seed/productos/premium-toallon.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('444184f1-6524-5930-8964-f92941bc44cf', '570808f5-c041-52e2-9c2a-07522e4b5239', '/seed/productos/premium-faja.webp', 1);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('fe6cc52a-61a6-5041-81ce-5661697a9484', '570808f5-c041-52e2-9c2a-07522e4b5239', 'Blanco', '#f5f4f1', '/seed/colores/premium-blanco.webp', 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('b24642c8-ffa2-5e8e-b10a-20b393a4aaef', '570808f5-c041-52e2-9c2a-07522e4b5239', 'fe6cc52a-61a6-5041-81ce-5661697a9484', 'Única', 30400, 6);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('5998a7c5-803f-59fb-ac6a-fb5640d2320d', '570808f5-c041-52e2-9c2a-07522e4b5239', 'Cemento', '#c7c0b8', '/seed/colores/premium-cemento.webp', 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('574899ba-155e-5c6a-bf80-58475e4994da', '570808f5-c041-52e2-9c2a-07522e4b5239', '5998a7c5-803f-59fb-ac6a-fb5640d2320d', 'Única', 30400, 6);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('29b55e88-b759-5fee-b9ad-a2c2a32da725', '570808f5-c041-52e2-9c2a-07522e4b5239', 'Beige', '#e2d5c4', '/seed/colores/premium-beige.webp', 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('ffe2c602-9fc6-525e-8fa2-2fa823e6088f', '570808f5-c041-52e2-9c2a-07522e4b5239', '29b55e88-b759-5fee-b9ad-a2c2a32da725', 'Única', 30400, 6);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('a601faee-ee32-51ea-83d5-9cb412340500', '570808f5-c041-52e2-9c2a-07522e4b5239', 'Gris Oscuro', '#aaa3a1', '/seed/colores/premium-gris-oscuro.webp', 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('93dcc24e-7a83-5eb6-a645-02bf945d7d41', '570808f5-c041-52e2-9c2a-07522e4b5239', 'a601faee-ee32-51ea-83d5-9cb412340500', 'Única', 30400, 6);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('47c357da-ddd9-5e92-a675-a1131c90ad04', '570808f5-c041-52e2-9c2a-07522e4b5239', 'Negro', '#1d1b1f', '/seed/colores/premium-negro.webp', 4);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('cb0a8780-d5c1-541c-ad81-a27c92cf1b78', '570808f5-c041-52e2-9c2a-07522e4b5239', '47c357da-ddd9-5e92-a675-a1131c90ad04', 'Única', 30400, 6);

-- FV-540 · Juego de Toalla y Toallón Bordado · lista $16.024 → venta $29.100
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('89dbe600-d49f-53fd-b46f-afed741c4579', 'Juego de Toalla y Toallón Bordado', 'FV-540', 'juego-toalla-y-toallon-bordado', 'Franco Valente', (select id from public.categories where slug = 'juegos-de-toalla-y-toallon'), 'liviana', 'Juego de toalla y toallón blancos en rizo 100% algodón de 400 g/m² (Línea Liviana de Franco Valente), con bordado floral. Viene en caja: listo para regalar. Los pesos y medidas son aproximados.', 'Motivo', 'Medida', true, true, 1799999995);
insert into public.product_images (id, product_id, url, orden) values ('cd702909-4908-5fd4-a24d-5cfc7ede28a8', '89dbe600-d49f-53fd-b46f-afed741c4579', '/seed/productos/bordado-hibisco.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('9f419a06-2381-529d-9cbd-15a383ff80c3', '89dbe600-d49f-53fd-b46f-afed741c4579', '/seed/productos/bordado-amapolas.webp', 1);
insert into public.product_images (id, product_id, url, orden) values ('7f3c8d58-787d-5d81-ae21-d7f26469f9c3', '89dbe600-d49f-53fd-b46f-afed741c4579', '/seed/productos/bordado-flores-azules.webp', 2);
insert into public.product_images (id, product_id, url, orden) values ('1bb0237d-fbd1-5e2f-b832-b6eefa4420ae', '89dbe600-d49f-53fd-b46f-afed741c4579', '/seed/productos/bordado-lavanda.webp', 3);
insert into public.product_images (id, product_id, url, orden) values ('9698cdbf-9d35-56cd-b2bd-653c6a41de0f', '89dbe600-d49f-53fd-b46f-afed741c4579', '/seed/productos/bordado-detalle.webp', 4);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('e7ab7486-d756-56b6-a400-d0d539289b92', '89dbe600-d49f-53fd-b46f-afed741c4579', 'Hibisco', '#f5f4f1', '/seed/productos/bordado-hibisco.webp', 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('a0a89f07-e21e-5b5d-bd08-297168e36169', '89dbe600-d49f-53fd-b46f-afed741c4579', 'e7ab7486-d756-56b6-a400-d0d539289b92', 'Única', 29100, 4);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('e1dab2a3-37b7-5907-b1cd-c6c936d8ebff', '89dbe600-d49f-53fd-b46f-afed741c4579', 'Amapolas', '#f5f4f1', '/seed/productos/bordado-amapolas.webp', 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('1615f450-b74e-50df-8f05-5a3a8d4ccfce', '89dbe600-d49f-53fd-b46f-afed741c4579', 'e1dab2a3-37b7-5907-b1cd-c6c936d8ebff', 'Única', 29100, 4);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('0eaac61a-b3d1-598f-a682-7aba9cbb6bab', '89dbe600-d49f-53fd-b46f-afed741c4579', 'Flores azules', '#f5f4f1', '/seed/productos/bordado-flores-azules.webp', 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('ecf49b09-df17-57b3-87fa-408b63764769', '89dbe600-d49f-53fd-b46f-afed741c4579', '0eaac61a-b3d1-598f-a682-7aba9cbb6bab', 'Única', 29100, 4);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('d8381f40-1c6c-56dc-a7be-0da5385fff19', '89dbe600-d49f-53fd-b46f-afed741c4579', 'Lavanda', '#f5f4f1', '/seed/productos/bordado-lavanda.webp', 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('77d11404-d1a8-5c30-96df-ec2c5d1c22bc', '89dbe600-d49f-53fd-b46f-afed741c4579', 'd8381f40-1c6c-56dc-a7be-0da5385fff19', 'Única', 29100, 4);

-- FV-111 · Toalla de Visita con Inicial Bordada · lista $2.849 → venta $5.200
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('2323a91a-fec0-5e2a-abc9-60164bb324ea', 'Toalla de Visita con Inicial Bordada', 'FV-111', 'toalla-de-visita-con-inicial-bordada', 'Franco Valente', (select id from public.categories where slug = 'toallas-de-visita'), null, 'Toalla de visita en rizo 100% algodón de 500 g/m² con la inicial bordada. Medida: 28 × 30 cm. Un detalle para el baño de invitados o para regalar. Los pesos y medidas son aproximados.', 'Color', 'Letra', true, false, 1799999994);
insert into public.product_images (id, product_id, url, orden) values ('6f132ed5-6513-58c6-99b0-775f9cb8aeac', '2323a91a-fec0-5e2a-abc9-60164bb324ea', '/seed/productos/inicial-a.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('ed1840af-535a-5f0a-aafd-d8eb43f440b9', '2323a91a-fec0-5e2a-abc9-60164bb324ea', '/seed/productos/inicial-b.webp', 1);
insert into public.product_images (id, product_id, url, orden) values ('d70ea54e-4536-5c97-b478-f3e798396d78', '2323a91a-fec0-5e2a-abc9-60164bb324ea', '/seed/productos/inicial-c.webp', 2);
insert into public.product_images (id, product_id, url, orden) values ('69aa4ffa-3d35-5b30-a361-14aea362afc8', '2323a91a-fec0-5e2a-abc9-60164bb324ea', '/seed/productos/inicial-d.webp', 3);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('fccee009-3326-5cb0-930c-05b296d705d9', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'Blanco', '#f5f4f1', null, 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('365ff10d-12dc-5b36-b98f-9f11a872f2c0', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'A', 5200, 5), ('8255514c-a05b-5544-880a-c6acb13f91ac', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'B', 5200, 5), ('78ce3ff3-82c0-508a-8fc5-c6fb3d46f294', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'C', 5200, 5), ('e48c99dd-e29c-50c6-acb4-4f02ed166c79', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'D', 5200, 5), ('8ea7e0ad-e031-5703-9815-fd39593d3180', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'E', 5200, 5), ('c29393fc-2995-521b-9545-c61b86ce8179', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'F', 5200, 5), ('f685edd2-178a-5505-830b-eafe3fcfe1d1', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'G', 5200, 5), ('9cde1f01-18cf-5cc2-a207-041c3f2362b7', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'H', 5200, 5), ('28041dd1-cc97-505e-8ab8-047b67eac8ab', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'I', 5200, 5), ('8f358af6-9d73-5a8b-9cc9-6bac86526557', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'J', 5200, 5), ('dc09a2a4-6c80-5e69-952b-f3b9765aba34', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'K', 5200, 5), ('536a556a-8b4b-5023-a88c-2ab4acdb12fd', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'L', 5200, 5), ('4b9b47ba-be99-5c7f-b0bc-4e0aa0840c97', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'M', 5200, 5), ('1bc309a2-96e2-5f12-a037-7882ee9c4ff8', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'N', 5200, 5), ('bc5467c9-75b2-574b-8040-ff25511dbbd8', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'O', 5200, 5), ('565fa002-a6b4-513a-8140-375994e5136b', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'P', 5200, 5), ('ab15698f-6c8a-5489-8418-5c70a71c3001', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'Q', 5200, 5), ('711329a0-d606-599c-bd7d-f7c1234d9df3', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'R', 5200, 5), ('67770393-3a0a-5562-ac3b-68f32cc40776', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'S', 5200, 5), ('9b89a0c2-78c1-5ad3-ab4b-fa7309e04ef0', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'T', 5200, 5), ('e33d63aa-cc1b-5744-b1ad-51f151df7e70', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'U', 5200, 5), ('6dc04b27-6939-57e9-bfde-d9957aecd056', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'V', 5200, 5), ('92a7da9c-ebb9-50c3-ade2-301eb843bb6c', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'W', 5200, 5), ('7bd74f53-cd9e-58e6-8681-ba1d89db8ea5', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'X', 5200, 5), ('fcae1507-012f-516c-97f8-da0502fa0e32', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'Y', 5200, 5), ('c03e4454-0a97-5b6f-81aa-8698bfacc248', '2323a91a-fec0-5e2a-abc9-60164bb324ea', 'fccee009-3326-5cb0-930c-05b296d705d9', 'Z', 5200, 5);

-- FV-2001 · Turbante para el Cabello · lista $6.126 → venta $11.200
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'Turbante para el Cabello', 'FV-2001', 'turbante-para-el-cabello', 'Franco Valente', (select id from public.categories where slug = 'turbantes'), null, 'Turbante de rizo 100% algodón para secar el pelo después de la ducha. Se vende en caja. Los pesos y medidas son aproximados.', 'Color', 'Medida', true, false, 1799999993);
insert into public.product_images (id, product_id, url, orden) values ('a77824df-4783-5b4f-8ed0-a0b94282d9d6', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', '/seed/productos/turbante-uso.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('9f5f6b4d-d814-50f6-96c9-d94b65e785ba', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', '/seed/productos/turbante-caja.webp', 1);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('4d9f6579-fc50-564e-a0ec-db6dae65ef26', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'Blanco', '#f5f4f1', null, 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('68babd05-1dba-59d0-8b0e-16963b009e24', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', '4d9f6579-fc50-564e-a0ec-db6dae65ef26', 'Única', 11200, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('e8354a23-55b4-543f-a664-d509a8f93202', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'Beige', '#e2d5c4', null, 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('66ec1a6c-5ce0-559e-8ec9-27e63cf75c8a', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'e8354a23-55b4-543f-a664-d509a8f93202', 'Única', 11200, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('e89c951e-9880-5dd1-862b-97618c4b7259', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'Hot Pink', '#ec3d75', null, 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('41aa8aa3-e4b9-517d-a8a5-034404dfccf2', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'e89c951e-9880-5dd1-862b-97618c4b7259', 'Única', 11200, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('e40f6036-3f6d-5b85-87c0-8cef3219d097', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'Coral', '#f45b57', null, 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('dc9bd53a-f400-5e9c-8f33-bf373f27f095', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'e40f6036-3f6d-5b85-87c0-8cef3219d097', 'Única', 11200, 10);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('93e7848c-2ed4-5949-b6ef-4c30d8087d02', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', 'Rosa Tierra', '#cc9998', null, 4);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('1bd5b7e9-765d-5f9b-b3c7-4cea051525ff', '3c333319-cd4e-5ca8-ab50-d1d44063f7ad', '93e7848c-2ed4-5949-b6ef-4c30d8087d02', 'Única', 11200, 10);

-- FV-3004 · Set x2 Repasadores Toalla Canelón 45 × 60 cm · lista $6.014 → venta $11.000
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('1663e25e-83bc-52bb-9c7f-422c5307e544', 'Set x2 Repasadores Toalla Canelón 45 × 60 cm', 'FV-3004', 'set-x2-repasadores-toalla-canelon', 'Franco Valente', (select id from public.categories where slug = 'repasadores'), null, 'Set de 2 repasadores de toalla canelón 100% algodón de 400 g/m². Medida de cada repasador: 45 × 60 cm. Los pesos y medidas son aproximados.', 'Color', 'Medida', true, false, 1799999992);
insert into public.product_images (id, product_id, url, orden) values ('01314ed6-2a1f-58fa-8560-7c2f8534df0c', '1663e25e-83bc-52bb-9c7f-422c5307e544', '/seed/productos/repasadores-beige.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('1ef81dd1-bf55-54f3-ab91-a5604a4ac514', '1663e25e-83bc-52bb-9c7f-422c5307e544', '/seed/productos/repasadores-uso.webp', 1);
insert into public.product_images (id, product_id, url, orden) values ('e1586a2e-a937-53a3-81fb-b1d19af3d2f1', '1663e25e-83bc-52bb-9c7f-422c5307e544', '/seed/productos/repasadores-coral.webp', 2);
insert into public.product_images (id, product_id, url, orden) values ('ef8e4498-5e8e-5b35-922a-ba6d9cd30170', '1663e25e-83bc-52bb-9c7f-422c5307e544', '/seed/productos/repasadores-francia.webp', 3);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('ac11a728-135b-51d0-8296-cad57bd4e68b', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'Blanco', '#f5f4f1', '/seed/productos/repasadores-blanco.webp', 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('adf1c428-b22e-5f01-8090-34ec379ae43e', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'ac11a728-135b-51d0-8296-cad57bd4e68b', 'Única', 11000, 12);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('f7292ffd-a3eb-5b2c-8c57-fd84dbb20bb8', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'Negro', '#1d1b1f', '/seed/productos/repasadores-negro.webp', 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('65bb78c1-e8ae-557c-a037-3c6d6ae52847', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'f7292ffd-a3eb-5b2c-8c57-fd84dbb20bb8', 'Única', 11000, 12);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('09c2cd08-4565-5758-b62b-ab57b7d7e08a', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'Beige', '#e2d5c4', '/seed/productos/repasadores-beige.webp', 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('2461d70d-1d65-55e8-919c-645c5bc453b0', '1663e25e-83bc-52bb-9c7f-422c5307e544', '09c2cd08-4565-5758-b62b-ab57b7d7e08a', 'Única', 11000, 12);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('a739a560-9b70-58f0-8c61-489740e24366', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'Coral', '#f45b57', '/seed/productos/repasadores-coral.webp', 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('853c71f6-82d7-5454-a9e7-15f199e8242f', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'a739a560-9b70-58f0-8c61-489740e24366', 'Única', 11000, 12);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('5ed91df2-b7a7-52ba-9573-6ef3a1b1ced4', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'Francia', '#1f5dab', '/seed/productos/repasadores-francia.webp', 4);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('e6c47d98-07db-54ab-aa2f-8b695aa0cab0', '1663e25e-83bc-52bb-9c7f-422c5307e544', '5ed91df2-b7a7-52ba-9573-6ef3a1b1ced4', 'Única', 11000, 12);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('1c407f56-2e78-5652-b52f-47526c9fe5e2', '1663e25e-83bc-52bb-9c7f-422c5307e544', 'Benetton', '#18bdab', '/seed/productos/repasadores-benetton.webp', 5);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('940abf44-729a-56b0-99b3-bfd0f84a7a13', '1663e25e-83bc-52bb-9c7f-422c5307e544', '1c407f56-2e78-5652-b52f-47526c9fe5e2', 'Única', 11000, 12);

-- FV-300 · Bata de Baño 100% Algodón · lista $30.098 → venta $54.700
insert into public.products (id, nombre, sku, slug, marca, category_id, linea, descripcion, etiqueta_color, etiqueta_medida, activo, destacado, orden)
values ('aacf4684-5936-5043-8f66-3693d841c8fb', 'Bata de Baño 100% Algodón', 'FV-300', 'bata-de-bano-100-algodon', 'Franco Valente', (select id from public.categories where slug = 'batas'), null, 'Bata de baño de rizo 100% algodón de 560 g/m², con cuello chal y cinturón. Talles XS a XL. Los pesos y medidas son aproximados.', 'Color', 'Talle', true, true, 1799999991);
insert into public.product_images (id, product_id, url, orden) values ('44f68050-23d6-582b-af8f-f5e6c11d5092', 'aacf4684-5936-5043-8f66-3693d841c8fb', '/seed/productos/bata-blanca.webp', 0);
insert into public.product_images (id, product_id, url, orden) values ('57fe3e8c-f318-5917-a5b4-86a86ef56e05', 'aacf4684-5936-5043-8f66-3693d841c8fb', '/seed/productos/bata-uso.webp', 1);
insert into public.product_images (id, product_id, url, orden) values ('69dd629d-508c-52dc-9087-682053927b33', 'aacf4684-5936-5043-8f66-3693d841c8fb', '/seed/productos/bata-gris-plata.webp', 2);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('cf26b436-8d44-5c3b-93a1-921760ab7361', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'Blanco', '#f5f4f1', '/seed/productos/bata-blanca.webp', 0);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('f6d81a32-f474-5c38-a068-ef6551e5fefc', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'cf26b436-8d44-5c3b-93a1-921760ab7361', 'XS', 54700, 3), ('30dbb554-2697-5562-98b2-64a3be3e524c', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'cf26b436-8d44-5c3b-93a1-921760ab7361', 'S', 54700, 3), ('91ae5cf9-abb6-56bb-9f84-bfe41ab64278', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'cf26b436-8d44-5c3b-93a1-921760ab7361', 'M', 54700, 3), ('a605a780-0beb-5eff-8d98-1ee6e4c31205', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'cf26b436-8d44-5c3b-93a1-921760ab7361', 'L', 54700, 3), ('d7fcb012-3a5b-5c2e-b4b6-683d05692dda', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'cf26b436-8d44-5c3b-93a1-921760ab7361', 'XL', 54700, 3);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('58ef1207-1d56-5862-a2ef-dba2e2fc987d', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'Cemento', '#c7c0b8', null, 1);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('4f753852-908e-5d83-9aee-6c15e60f65a6', 'aacf4684-5936-5043-8f66-3693d841c8fb', '58ef1207-1d56-5862-a2ef-dba2e2fc987d', 'XS', 54700, 3), ('0a1b63ba-c7ee-5092-8d99-2255d2ba0154', 'aacf4684-5936-5043-8f66-3693d841c8fb', '58ef1207-1d56-5862-a2ef-dba2e2fc987d', 'S', 54700, 3), ('4fc89c99-5459-5ad8-90f7-015212028857', 'aacf4684-5936-5043-8f66-3693d841c8fb', '58ef1207-1d56-5862-a2ef-dba2e2fc987d', 'M', 54700, 3), ('7c7b2875-5749-57fb-a016-a678ad2f659f', 'aacf4684-5936-5043-8f66-3693d841c8fb', '58ef1207-1d56-5862-a2ef-dba2e2fc987d', 'L', 54700, 3), ('357e7113-0a09-5375-81b0-8bfbb59ca818', 'aacf4684-5936-5043-8f66-3693d841c8fb', '58ef1207-1d56-5862-a2ef-dba2e2fc987d', 'XL', 54700, 3);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('4b61b52a-9b4a-592c-8cdd-6f1318a98afe', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'Beige', '#e2d5c4', null, 2);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('5e9eaa8a-93a7-5e00-a17f-afe51ada1184', 'aacf4684-5936-5043-8f66-3693d841c8fb', '4b61b52a-9b4a-592c-8cdd-6f1318a98afe', 'XS', 54700, 3), ('8beb2b43-0c58-5cec-8431-9243c61cce99', 'aacf4684-5936-5043-8f66-3693d841c8fb', '4b61b52a-9b4a-592c-8cdd-6f1318a98afe', 'S', 54700, 3), ('ecd8b341-2b0d-5141-bfb1-a8ffbb5faaeb', 'aacf4684-5936-5043-8f66-3693d841c8fb', '4b61b52a-9b4a-592c-8cdd-6f1318a98afe', 'M', 54700, 3), ('33c8d9cb-ab52-54e7-8105-7d546b0a5e60', 'aacf4684-5936-5043-8f66-3693d841c8fb', '4b61b52a-9b4a-592c-8cdd-6f1318a98afe', 'L', 54700, 3), ('cbbf8234-1312-547f-b499-a3b5fa3bf8d6', 'aacf4684-5936-5043-8f66-3693d841c8fb', '4b61b52a-9b4a-592c-8cdd-6f1318a98afe', 'XL', 54700, 3);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('16274925-2ee9-5da8-9fc2-61b85c610b13', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'Marino', '#1c3751', null, 3);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('090afcf7-0ef9-581d-9382-f69531ecdbdc', 'aacf4684-5936-5043-8f66-3693d841c8fb', '16274925-2ee9-5da8-9fc2-61b85c610b13', 'XS', 54700, 3), ('cf978f94-65a3-5fed-8f39-d933c22937a3', 'aacf4684-5936-5043-8f66-3693d841c8fb', '16274925-2ee9-5da8-9fc2-61b85c610b13', 'S', 54700, 3), ('69309fb2-75b8-5c86-8dbf-b1fddbdda493', 'aacf4684-5936-5043-8f66-3693d841c8fb', '16274925-2ee9-5da8-9fc2-61b85c610b13', 'M', 54700, 3), ('09de1ce1-c1ec-5a56-a14d-58f1471c3c11', 'aacf4684-5936-5043-8f66-3693d841c8fb', '16274925-2ee9-5da8-9fc2-61b85c610b13', 'L', 54700, 3), ('61c47772-ab67-5232-8717-716311474bef', 'aacf4684-5936-5043-8f66-3693d841c8fb', '16274925-2ee9-5da8-9fc2-61b85c610b13', 'XL', 54700, 3);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('d4f9707f-ad79-5fb4-a013-7c99103d5326', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'Negro', '#1d1b1f', null, 4);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('64721f91-9e06-5418-9363-001a3bca899d', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'd4f9707f-ad79-5fb4-a013-7c99103d5326', 'XS', 54700, 3), ('379d6279-b39f-5514-bd81-c85c86b491ff', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'd4f9707f-ad79-5fb4-a013-7c99103d5326', 'S', 54700, 3), ('c1c6296a-bcc6-5cd1-9b91-bf6a8e262348', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'd4f9707f-ad79-5fb4-a013-7c99103d5326', 'M', 54700, 3), ('379ef4c0-0128-57c7-884f-db06132bf6ff', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'd4f9707f-ad79-5fb4-a013-7c99103d5326', 'L', 54700, 3), ('b4b4a2fa-e348-5ab4-835f-08ba7160a493', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'd4f9707f-ad79-5fb4-a013-7c99103d5326', 'XL', 54700, 3);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('ce314495-b8fa-5d01-ad74-3dc12f34552c', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'Gris Plata', '#bbb4b4', '/seed/productos/bata-gris-plata.webp', 5);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('bd53b2b0-adb2-5cad-89d6-caf4f18ae603', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'ce314495-b8fa-5d01-ad74-3dc12f34552c', 'XS', 54700, 3), ('823c97db-d992-57a9-b28b-a99c744c4696', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'ce314495-b8fa-5d01-ad74-3dc12f34552c', 'S', 54700, 3), ('e5f102f8-5653-5934-9f71-a478f6e706c7', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'ce314495-b8fa-5d01-ad74-3dc12f34552c', 'M', 54700, 3), ('afa3a51e-231c-5e7a-bd78-84b52f898e85', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'ce314495-b8fa-5d01-ad74-3dc12f34552c', 'L', 54700, 3), ('eddd07ef-09bd-5d8a-8758-62ec2c703244', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'ce314495-b8fa-5d01-ad74-3dc12f34552c', 'XL', 54700, 3);
insert into public.product_colors (id, product_id, nombre, hex, foto, orden) values ('f331e136-f29f-5b12-a73b-0063991c51bf', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'Rosa Tierra', '#cc9998', null, 6);
insert into public.product_variants (id, product_id, color_id, medida, precio, stock) values ('aa36503c-49a2-5305-b7f2-213d21269ff0', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'f331e136-f29f-5b12-a73b-0063991c51bf', 'XS', 54700, 3), ('8173585a-2a94-511a-9408-951c7f544bc6', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'f331e136-f29f-5b12-a73b-0063991c51bf', 'S', 54700, 3), ('7592a070-5704-5c8c-a0a9-de6751eba4c0', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'f331e136-f29f-5b12-a73b-0063991c51bf', 'M', 54700, 3), ('a102d75a-7a42-5ad2-8dde-b5d586e95b0f', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'f331e136-f29f-5b12-a73b-0063991c51bf', 'L', 54700, 3), ('29f77737-25c4-5230-8476-08de3b213a8e', 'aacf4684-5936-5043-8f66-3693d841c8fb', 'f331e136-f29f-5b12-a73b-0063991c51bf', 'XL', 54700, 3);

-- Banners de la home
delete from public.hero_banners where url like '/seed/%';
insert into public.hero_banners (id, url, url_mobile, titulo, subtitulo, boton, link, orden, activo) values
  ('24c0928f-af56-5a2a-8a70-93776ab72a6f', '/seed/banners/hero-1-desktop.webp', '/seed/banners/hero-1-mobile.webp', 'Toallas 100% algodón', 'Líneas Liviana, Pesada y Premium', 'Ver toallas', '/productos?categoria=juegos-de-toalla-y-toallon', 1, true),
  ('15e9bc91-e5a4-5e82-a9fb-3300f70de638', '/seed/banners/hero-2-desktop.webp', '/seed/banners/hero-2-mobile.webp', 'Blanquería para tu casa', 'Juegos de toallas, batas, turbantes y repasadores', 'Ver todo', '/productos', 2, true);

-- Condiciones comerciales (editables en /admin/configuracion)
insert into public.site_settings (key, value) values ('comercial', '{"transferencia_pct": 15, "cuotas": 6, "envio_gratis_desde": 150000, "costo_envio": null, "retiro_habilitado": false, "retiro_direccion": ""}'::jsonb)
  on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('contacto', '{"whatsapp": "", "email": "", "direccion": "", "instagram": "", "horario": ""}'::jsonb)
  on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('transferencia', '{"titular": "", "cuit": "", "banco": "", "cbu": "", "alias": ""}'::jsonb)
  on conflict (key) do nothing;

-- Paleta de colores Franco Valente para el editor de productos
delete from public.palette_colors;
insert into public.palette_colors (nombre, hex, orden) values
  ('Blanco', '#f5f4f1', 1),
  ('Crudo', '#eae5da', 2),
  ('Cemento', '#c7c0b8', 3),
  ('Bordó', '#6a152b', 4),
  ('Beige', '#e2d5c4', 5),
  ('Marino', '#1c3751', 6),
  ('Negro', '#1d1b1f', 7),
  ('Benetton', '#18bdab', 8),
  ('Hot Pink', '#ec3d75', 9),
  ('Bermellón', '#d9233e', 10),
  ('Uva', '#af84a7', 11),
  ('Coral', '#f45b57', 12),
  ('Francia', '#1f5dab', 13),
  ('Rojo Ladrillo', '#b55041', 14),
  ('Celeste Polo', '#93b6df', 15),
  ('Rosa Tierra', '#cc9998', 16),
  ('Verde Inglés', '#455954', 17),
  ('Gris Oscuro', '#aaa3a1', 18),
  ('Gris Plata', '#bbb4b4', 19);

commit;

-- Primer admin (reemplazar por el uuid real de auth.users):
-- insert into public.admin_users (user_id) values ('<uuid-del-usuario>');

