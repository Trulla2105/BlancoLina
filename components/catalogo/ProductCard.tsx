/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { precioTransferencia, resumenPrecio, tieneEnvioGratis, valorCuota } from "@/lib/precios";
import { publicImageUrl } from "@/lib/supabase/env";
import type { ConfigComercial, Product } from "@/lib/types";
import { QuickAdd } from "./QuickAdd";

const NEW_DAYS = 30;
const MAX_SWATCHES = 5;

function esNuevo(product: Product): boolean {
  if (product.ocultar_nuevo) return false;
  return Date.now() - new Date(product.created_at).getTime() < NEW_DAYS * 24 * 60 * 60 * 1000;
}

export function ProductCard({ product, cfg }: { product: Product; cfg: ConfigComercial }) {
  const href = `/productos/${product.slug}`;
  const [img1, img2] = product.product_images;
  const r = resumenPrecio(product);
  const agotado = r.stockTotal === 0;
  const envioGratis = r.precio != null && tieneEnvioGratis(r.precio, cfg);
  const colores = product.product_colors;

  return (
    <article className="pcard">
      <div className="pcard-media">
        <Link href={href} className="pcard-img" aria-label={product.nombre}>
          {img1 ? (
            <>
              <img src={publicImageUrl(img1.url)} alt={product.nombre} loading="lazy" />
              {img2 && (
                <img src={publicImageUrl(img2.url)} alt="" loading="lazy" className="pcard-img-alt" aria-hidden />
              )}
            </>
          ) : (
            <span className="pcard-noimg">Sin foto</span>
          )}
        </Link>
        <div className="pcard-labels">
          {agotado && <span className="label label-dark">Sin stock</span>}
          {!agotado && r.descuentoPct != null && <span className="label">{r.descuentoPct}% OFF</span>}
          {!agotado && envioGratis && <span className="label">Envío gratis</span>}
          {!agotado && r.descuentoPct == null && esNuevo(product) && <span className="label label-light">Nuevo</span>}
        </div>
        {!agotado && <QuickAdd product={product} cfg={cfg} />}
      </div>

      <div className="pcard-body">
        <Link href={href} className="pcard-name">
          {product.nombre}
        </Link>
        {r.precio != null && (
          <>
            {r.precioLista != null && <div className="pcard-old">{formatPrice(r.precioLista)}</div>}
            <div className="pcard-price">
              {r.desde && <span className="pcard-desde">Desde </span>}
              {formatPrice(r.precio)}
              {r.descuentoPct != null && <span className="pcard-off">{r.descuentoPct}% OFF</span>}
            </div>
            {cfg.transferencia_pct > 0 && (
              <div className="pcard-transfer">
                <strong>{formatPrice(precioTransferencia(r.precio, cfg))}</strong> con Transferencia
              </div>
            )}
            {cfg.cuotas > 1 && (
              <div className="pcard-cuotas">
                {cfg.cuotas} x {formatPrice(valorCuota(r.precio, cfg))} sin interés
              </div>
            )}
          </>
        )}
        {colores.length > 1 && (
          <div className="pcard-swatches" aria-label={`${colores.length} opciones`}>
            {colores.slice(0, MAX_SWATCHES).map((c) => (
              <span
                key={c.id}
                className="pcard-swatch"
                title={c.nombre}
                style={c.hex ? { background: c.hex } : undefined}
              >
                {c.foto && product.etiqueta_color !== "Color" ? (
                  <img src={publicImageUrl(c.foto)} alt="" loading="lazy" />
                ) : null}
              </span>
            ))}
            {colores.length > MAX_SWATCHES && (
              <span className="pcard-swatch-more">+{colores.length - MAX_SWATCHES}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
