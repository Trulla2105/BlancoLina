"use client";

import { useMemo, useState } from "react";
import { publicImageUrl } from "@/lib/supabase/env";
import { precioVariante, resumenPrecio } from "@/lib/precios";
import type { ConfigComercial, Product } from "@/lib/types";
import { AddToCart } from "./AddToCart";
import { PriceBlock } from "./PriceBlock";
import { ProductGallery } from "./ProductGallery";
import { useVariantes } from "./useVariantes";
import { VariantPickers } from "./VariantPickers";

/** Ficha de producto: galería + elección de variante + precio + carrito. */
export function ProductDetail({
  product,
  cfg,
  children,
}: {
  product: Product;
  cfg: ConfigComercial;
  children?: React.ReactNode; // acordeones (descripción, pagos, envíos…)
}) {
  const sel = useVariantes(product);
  const [avisoMedida, setAvisoMedida] = useState(false);

  // Galería: las fotos del producto. Cuando el cliente elige un color que
  // tiene foto propia, esa foto pasa adelante (y no se llenan las miniaturas
  // con una foto por color: para eso están los cuadraditos de color).
  const [fotoColor, setFotoColor] = useState<string | null>(null);
  const imagenes = useMemo(() => {
    const urls = product.product_images.map((i) => publicImageUrl(i.url));
    if (fotoColor && !urls.includes(fotoColor)) return [fotoColor, ...urls];
    return urls;
  }, [product, fotoColor]);
  const [activa, setActiva] = useState(0);

  function elegirColor(id: string) {
    sel.setColorId(id);
    const c = product.product_colors.find((x) => x.id === id);
    if (c?.foto) {
      const u = publicImageUrl(c.foto);
      setFotoColor(u);
      const enProducto = product.product_images.findIndex((i) => publicImageUrl(i.url) === u);
      setActiva(enProducto >= 0 ? enProducto : 0);
    }
  }

  const resumen = resumenPrecio(product);
  const v = sel.variante;
  const precio = v ? precioVariante(v) : resumen.precio;
  const precioLista = v ? (v.precio_oferta != null ? v.precio : null) : resumen.precioLista;

  return (
    <div className="detail">
      <div className="detail-gallery">
        <ProductGallery imagenes={imagenes} nombre={product.nombre} activa={activa} onChange={setActiva} />
      </div>
      <div className="detail-info">
        <h1 className="detail-title">{product.nombre}</h1>
        <div className="detail-meta">
          {product.marca && <span>{product.marca}</span>}
          <span>Art. {product.sku}</span>
        </div>

        {precio != null ? (
          <PriceBlock precio={precio} precioLista={precioLista} cfg={cfg} />
        ) : (
          <div className="price-block">Consultar precio</div>
        )}

        <VariantPickers
          product={product}
          sel={{ ...sel, setColorId: elegirColor, setMedida: (m) => { setAvisoMedida(false); sel.setMedida(m); } }}
          avisoMedida={avisoMedida}
        />

        {resumen.stockTotal === 0 ? (
          <div className="detail-soldout">Sin stock por el momento.</div>
        ) : (
          <AddToCart product={product} sel={sel} onFaltaMedida={() => setAvisoMedida(true)} />
        )}

        <div className="detail-extra">{children}</div>
      </div>
    </div>
  );
}
