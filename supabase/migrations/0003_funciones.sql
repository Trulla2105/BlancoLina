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
