# Puesta en marcha de Hogar Lina

Pasos para publicar la tienda. Lo que depende de paneles externos (Supabase,
Vercel, Mercado Pago, Resend) está escrito según cómo se hizo con Kriger; los
nombres de los menús de esos paneles cambian seguido, así que puede no coincidir
palabra por palabra.

## 1. Supabase (base de datos, fotos y usuarios del panel)

1. Crear un proyecto nuevo en supabase.com → **New project** (región São Paulo
   o us-east, la que tenga menos latencia para Argentina).
   - El plan gratis tiene un límite de proyectos activos. La organización que
     ya usás tiene activos los de espiritu-orders y ep-restaurant: si Supabase
     no te deja crear el tercero, las opciones son pausar uno que no uses,
     crearlo en otra organización/cuenta, o pasar a un plan pago. Es una
     decisión tuya; el código funciona igual en cualquiera.
2. **SQL Editor** → New query → pegar entero `supabase/setup.sql` → **Run**.
   Crea tablas, permisos (RLS), funciones, el bucket de fotos y carga los 10
   productos de ejemplo.
3. **Authentication → Users → Add user**: tu email y una contraseña (marcar
   que quede confirmado). Copiar el **UID** del usuario creado y en el SQL
   Editor correr:
   ```sql
   insert into public.admin_users (user_id) values ('<UID-del-usuario>');
   ```
4. **Project Settings → API / API Keys**: copiar
   - la **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - la clave pública (**anon** o **publishable**) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - la clave **service_role** o **secret** → `SUPABASE_SERVICE_ROLE_KEY`
     (solo hace falta para Mercado Pago; es secreta, va únicamente en Vercel).

## 2. Vercel (publicación)

1. **Add New → Project** → importar el repositorio de GitHub.
2. En **Environment Variables** cargar (ver `.env.local.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (obligatorias)
   - `NEXT_PUBLIC_SITE_URL` = la dirección final (ej.
     `https://www.hogarlina.com.ar`). Se usa en los links de los emails y en
     la vuelta de Mercado Pago.
3. **Deploy**. Vercel publica desde la rama `main`; cada PR tiene además una
   URL de vista previa.
4. Dominio propio: **Settings → Domains** y seguir las instrucciones de DNS que
   muestra Vercel.
5. `vercel.json` trae un cron diario a `/api/keep-alive` para que Supabase
   (plan gratis) no pause el proyecto por inactividad.

## 3. Primer ingreso al panel

`https://<tu-dominio>/admin/ingresar` con el usuario del paso 1.3. En
**Configuración** completar:
- **Contacto**: WhatsApp, email, Instagram, dirección, horario (aparecen en el
  pie, en Ayuda, en el botón flotante de WhatsApp y en los emails).
- **Datos para transferencias**: titular, CUIT, banco, CBU/CVU y alias (se le
  muestran al cliente al confirmar un pedido por transferencia).
- **Condiciones comerciales**: % de descuento por transferencia (15), cuotas
  sin interés (6), envío gratis desde ($150.000), costo de envío fijo (vacío =
  se coordina con el cliente) y retiro en el local.

## 4. Emails (opcional, recomendado)

Cuenta en resend.com → verificar el dominio → crear una API key. En Vercel:
`RESEND_API_KEY`, `EMAIL_FROM` (ej. `Hogar Lina <pedidos@tu-dominio>`) y
`HOGAR_NOTIF_EMAIL` (tu email, adónde llega el aviso de cada pedido).
Sin esto la tienda funciona igual, pero no manda emails.

## 5. Mercado Pago (opcional: tarjetas y cuotas)

Sin estas variables la tienda cobra solo por transferencia.

1. En el panel de desarrolladores de Mercado Pago, crear una aplicación de
   **Checkout Pro** y copiar el **Access Token de producción** →
   `MP_ACCESS_TOKEN`.
2. En la sección de **Webhooks** de esa aplicación, cargar la URL
   `https://<tu-dominio>/api/mercadopago/webhook`, evento **Pagos**, y copiar
   la **clave secreta** de la firma → `MP_WEBHOOK_SECRET`.
3. Cargar también `SUPABASE_SERVICE_ROLE_KEY` (paso 1.4): el webhook la usa
   para marcar el pedido como pagado.
4. Las **cuotas sin interés** se activan en tu cuenta de Mercado Pago (tienen
   costo para el vendedor). El sitio solo informa y limita la cantidad máxima
   de cuotas a la que pongas en Configuración.

Cómo funciona: el cliente elige Mercado Pago → se crea el pedido (stock
reservado) → paga en Mercado Pago → vuelve a `/pedido/<token>`. El pedido
pasa a **Pagado** cuando Mercado Pago avisa por webhook (o al volver del
pago), después de consultar el pago a la API de Mercado Pago y comprobar que
el monto coincide con el total.

**No verificado todavía:** la conexión real con Mercado Pago (desde el entorno
de desarrollo no hay acceso a su API). Se probó que, si Mercado Pago no
responde, el pedido queda pendiente con un botón para reintentar el pago, y
que el webhook rechaza avisos sin firma válida. Hacer una compra de prueba con
credenciales de prueba antes de publicar.

## 6. Productos de ejemplo

`supabase/seed.sql` carga 10 artículos de la lista Franco Valente del
13/10/2026:
- **Precio** = lista sin IVA × 1,21 × 1,5 (margen 50%), redondeado hacia
  arriba a los $100.
- **Stock**: valores de ejemplo (3 a 12 por variante). Cargar el real en
  Productos.
- **Fotos**: del catálogo Franco Valente 2026, en `public/seed/`.

Volver a correr el seed restablece esos 10 productos (pisa lo editado en el
panel): correrlo una sola vez.

## 7. Pedidos

- Transferencia: el pedido queda **Pendiente de pago**; cuando llega el
  comprobante, pasarlo a **Pagado** en Pedidos (le llega un email al cliente).
- **Cancelar** un pedido devuelve el stock automáticamente. Un pedido
  cancelado no se puede reactivar.
- Los pedidos pendientes de pago reservan stock hasta que se cancelan.

## Desarrollo: regenerar setup.sql

Si se agrega o cambia una migración:

```bash
{ for f in supabase/migrations/*.sql supabase/seed.sql; do printf -- '-- >>> %s\n' "$f"; cat "$f"; printf '\n'; done; } > supabase/setup.sql
```

## Desarrollo: prueba local completa sin Supabase

Así se verificó el recorrido de compra y el panel (24/11/2026):

1. Postgres local con un "shim" de lo mínimo de Supabase (roles `anon`,
   `authenticated`, `service_role`, `authenticator`; esquemas `auth` con
   `auth.uid()` y `storage` con `buckets`/`objects`), y encima las
   migraciones + seed.
2. PostgREST en Docker (`postgrest/postgrest`) contra esa base, con
   `PGRST_DB_ANON_ROLE=anon` y un `PGRST_JWT_SECRET` local.
3. Un gateway chico en Node que expone `/rest/v1/*` → PostgREST y
   `/auth/v1/user` (valida el JWT local), para usar como
   `NEXT_PUBLIC_SUPABASE_URL`. La anon key es un JWT `role: anon` firmado
   con ese secreto.
4. `npx next build` y `npx next start`, y el recorrido con Playwright.
