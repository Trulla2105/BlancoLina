import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCarousel } from "@/components/catalogo/ProductCarousel";
import { ProductDetail } from "@/components/catalogo/ProductDetail";
import { formatPrice } from "@/lib/format";
import { mercadoPagoHabilitado } from "@/lib/mercadopago";
import { resumenPrecio } from "@/lib/precios";
import { getConfigComercial, getProductBySlug, getProducts, getViewer } from "@/lib/queries";
import { SITE } from "@/lib/site";
import { publicImageUrl } from "@/lib/supabase/env";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  const img = product.product_images[0]?.url;
  return {
    title: product.nombre,
    description: product.descripcion?.slice(0, 160) ?? SITE.descripcion,
    openGraph: img ? { images: [publicImageUrl(img)] } : undefined,
  };
}

export default async function ProductoPage({ params }: Params) {
  const { slug } = await params;
  const [product, cfg, viewer] = await Promise.all([
    getProductBySlug(slug),
    getConfigComercial(),
    getViewer(),
  ]);
  if (!product || (!product.activo && !viewer.isAdmin)) notFound();

  const relacionados = product.categories
    ? await getProducts({ categorySlug: product.categories.slug, excluirId: product.id, limit: 8 })
    : [];
  const r = resumenPrecio(product);

  // Datos estructurados para Google (producto + precio + stock).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nombre,
    sku: product.sku,
    brand: product.marca ? { "@type": "Brand", name: product.marca } : undefined,
    description: product.descripcion ?? undefined,
    image: product.product_images.map((i) => {
      const u = publicImageUrl(i.url);
      return u.startsWith("/") ? `${SITE.url}${u}` : u;
    }),
    offers:
      r.precio != null
        ? {
            "@type": "Offer",
            priceCurrency: "ARS",
            price: r.precio,
            availability: r.stockTotal > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE.url}/productos/${product.slug}`,
          }
        : undefined,
  };

  return (
    <>
      <nav className="crumbs crumbs-detail" aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span>›</span>
        <Link href="/productos">Productos</Link>
        {product.categories && (
          <>
            <span>›</span>
            <Link href={`/productos?categoria=${product.categories.slug}`}>{product.categories.nombre}</Link>
          </>
        )}
      </nav>

      <ProductDetail product={product} cfg={cfg}>
        {product.descripcion && (
          <details className="acc" open>
            <summary>Descripción</summary>
            <p>{product.descripcion}</p>
          </details>
        )}
        <details className="acc">
          <summary>Medios de pago</summary>
          <ul>
            {cfg.transferencia_pct > 0 ? (
              <li>
                Transferencia bancaria con <strong>{cfg.transferencia_pct}% de descuento</strong>.
              </li>
            ) : (
              <li>Transferencia bancaria.</li>
            )}
            {mercadoPagoHabilitado() && (
              <li>
                Tarjetas de crédito y débito con Mercado Pago
                {cfg.cuotas > 1 ? `, hasta ${cfg.cuotas} cuotas sin interés` : ""}.
              </li>
            )}
          </ul>
        </details>
        <details className="acc">
          <summary>Envíos</summary>
          <ul>
            <li>Envíos a todo el país.</li>
            {cfg.envio_gratis_desde != null && (
              <li>Envío gratis en compras desde {formatPrice(cfg.envio_gratis_desde)}.</li>
            )}
            {cfg.costo_envio == null ? (
              <li>Por debajo de ese monto, el costo del envío se coordina después de la compra.</li>
            ) : (
              <li>Costo de envío: {formatPrice(cfg.costo_envio)}.</li>
            )}
            {cfg.retiro_habilitado && cfg.retiro_direccion && <li>Retiro sin cargo en {cfg.retiro_direccion}.</li>}
          </ul>
        </details>
        <details className="acc">
          <summary>Cambios y devoluciones</summary>
          <p>
            Tenés 10 días corridos desde que recibís el producto para arrepentirte de la compra
            (art. 34, Ley 24.240). Podés hacerlo desde el{" "}
            <Link href="/arrepentimiento">Botón de arrepentimiento</Link>. Más info en{" "}
            <Link href="/ayuda#cambios">Cambios y devoluciones</Link>.
          </p>
        </details>
      </ProductDetail>

      {relacionados.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>También te puede gustar</h2>
          </div>
          <ProductCarousel products={relacionados} cfg={cfg} />
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
