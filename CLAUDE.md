@AGENTS.md

# Hogar Lina — memoria del proyecto

Tienda online minorista de blanquería (toallas, batas, turbantes, repasadores).
Next.js 16 (App Router, `proxy.ts` en vez de `middleware.ts`) + Supabase +
Vercel. Base de código tomada de `kriger-web` y adaptada a venta minorista;
estilo visual inspirado en pretahome.com (Tiendanube, tema Ipanema).

## Reglas de trabajo (las mismas que en los otros proyectos del dueño)

1. Chequear el código y la base antes de responder o tocar algo. No asumir.
2. Nada de parches: soluciones completas. Si algo no es la solución de fondo, decirlo.
3. Pensar el pipeline completo: GitHub + Vercel (build) + Supabase (migraciones/RLS).
4. Verificar el build entero (`npx next build` con un `.env.local` de valores
   inventados tiene que llegar a "Generating static pages (n/n)").
5. Ser honesto con lo que no se puede verificar (paneles de Supabase, Vercel,
   Mercado Pago que solo ve el dueño).
6. Respuestas al dueño: ultra concisas, la respuesta en la primera línea.
   Conciso no es omitir: lo no verificado, lo pendiente y el número de PR van siempre.
7. El PR se abre con el primer commit. Después de un merge, PR nuevo.

## Cómo está armado

- **Precios públicos.** No hay cuentas de clientes: compra como invitado.
- **Pedidos:** el navegador nunca inserta en `orders`. Llama a la función
  `crear_pedido` (migración 0003), que toma precio y stock de la base, aplica
  el descuento por transferencia y el envío gratis según `site_settings.comercial`
  y descuenta stock. Cancelar un pedido devuelve el stock (trigger).
  Si se cambia una regla de precio, cambiarla en `lib/precios.ts` Y en `crear_pedido`.
- **Cliente ve su pedido** en `/pedido/<token>` vía la función `ver_pedido`.
- **Mercado Pago** (Checkout Pro, sin SDK): `lib/mercadopago.ts` + webhook en
  `app/api/mercadopago/webhook`. Se activa solo con `MP_ACCESS_TOKEN` +
  `SUPABASE_SERVICE_ROLE_KEY`. El webhook no confía en el cuerpo: consulta el
  pago a la API de MP y valida monto y moneda antes de marcar "pagado".
- **Configuración editable** en `/admin/configuracion` (condiciones comerciales,
  contacto, datos bancarios) → tabla `site_settings`.
- **Fotos de ejemplo** en `public/seed/` (salen del catálogo Franco Valente 2026).
  Las que se suben desde el panel van al bucket `product-images` de Storage.
- **Legales AR:** Botón de arrepentimiento (`/arrepentimiento`, Res. 424/2020)
  y link a Defensa del Consumidor en el pie.

## Migraciones

`supabase/migrations/` en orden numérico. `supabase/setup.sql` es la
concatenación de todas + `seed.sql` para pegar de una vez en el SQL Editor:
si se agrega o cambia una migración, regenerarlo (ver docs/puesta-en-marcha.md).
Los `grant` a `anon`/`authenticated` van dentro de un `if exists (select 1 from
pg_roles …)` para que las migraciones se puedan probar en un Postgres local.

## Prueba local completa (sin Supabase real)

Postgres local + PostgREST en Docker + un gateway mínimo que imita
`/rest/v1` y `/auth/v1/user` de Supabase. Así se probó el recorrido de compra
y el panel el 24/11/2026. Los pasos están en docs/puesta-en-marcha.md.
