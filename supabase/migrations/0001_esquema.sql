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
