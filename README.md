# Hogar Lina — tienda online de blanquería

Venta minorista de toallas, toallones, batas, turbantes y repasadores.
Next.js 16 (App Router) + TypeScript + Supabase, pensado para Vercel.

## Qué tiene

- **Tienda** (`/`): home con banners, más vendidos por categoría, categorías,
  líneas (Liviana / Pesada / Premium), listado con filtros y orden, ficha con
  color + medida/talle, precio con transferencia y cuotas, carrito lateral,
  checkout de invitado y página de seguimiento del pedido.
- **Pagos**: transferencia (con % de descuento) y Mercado Pago Checkout Pro
  (tarjetas, cuotas) cuando están cargadas las credenciales.
- **Panel** (`/admin`): pedidos y estados, productos (colores, medidas, precio,
  oferta, stock, fotos), categorías y líneas, banners, condiciones comerciales,
  contacto, datos bancarios, Instagram, arrepentimientos y newsletter.
- **Legales AR**: Botón de arrepentimiento y link a Defensa del Consumidor.

## Puesta en marcha

Ver [docs/puesta-en-marcha.md](docs/puesta-en-marcha.md): Supabase
(`supabase/setup.sql` de una vez), primer admin, variables en Vercel, emails y
Mercado Pago.

## Desarrollo

```bash
npm install
cp .env.local.example .env.local   # completar con los datos de Supabase
npm run dev
```

Antes de subir cambios: `npx tsc --noEmit` y `npx next build` completo.
