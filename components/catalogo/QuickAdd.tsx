"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/ui/Icons";
import { useCart } from "@/lib/cart/CartContext";
import { precioVariante, resumenPrecio } from "@/lib/precios";
import { publicImageUrl } from "@/lib/supabase/env";
import type { ConfigComercial, Product } from "@/lib/types";
import { AddToCart } from "./AddToCart";
import { PriceBlock } from "./PriceBlock";
import { useVariantes } from "./useVariantes";
import { VariantPickers } from "./VariantPickers";

/**
 * Barra "Agregar al carrito" de la tarjeta. Si el producto tiene una sola
 * variante con stock la agrega directo; si no, abre un selector rápido.
 */
export function QuickAdd({ product, cfg }: { product: Product; cfg: ConfigComercial }) {
  const [open, setOpen] = useState(false);
  const { addItem } = useCart();
  const variantes = product.product_colors.flatMap((c) =>
    c.product_variants.map((v) => ({ v, c }))
  );
  const conStock = variantes.filter(({ v }) => v.stock > 0);
  if (conStock.length === 0) return null;

  function click() {
    if (conStock.length === 1) {
      const { v, c } = conStock[0];
      const imagen = c.foto ?? product.product_images[0]?.url ?? null;
      addItem({
        variantId: v.id,
        slug: product.slug,
        nombre: product.nombre,
        color: c.nombre,
        medida: v.medida,
        etiquetaMedida: product.etiqueta_medida,
        imagen: imagen ? publicImageUrl(imagen) : null,
        precio: precioVariante(v),
        stock: v.stock,
        cantidad: 1,
      });
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button type="button" className="pcard-add" onClick={click}>
        Agregar al carrito
      </button>
      {open && <QuickAddModal product={product} cfg={cfg} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickAddModal({
  product,
  cfg,
  onClose,
}: {
  product: Product;
  cfg: ConfigComercial;
  onClose: () => void;
}) {
  const sel = useVariantes(product);
  const [aviso, setAviso] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const resumen = resumenPrecio(product);
  const v = sel.variante;
  const precio = v ? precioVariante(v) : resumen.precio;
  const precioLista = v ? (v.precio_oferta != null ? v.precio : null) : resumen.precioLista;
  const foto = sel.color?.foto ?? product.product_images[0]?.url ?? null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal quick-add"
        role="dialog"
        aria-modal="true"
        aria-label={`Elegir opciones de ${product.nombre}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close icon-button" aria-label="Cerrar" onClick={onClose}>
          <CloseIcon size={18} />
        </button>
        <div className="quick-add-img">{foto && <img src={publicImageUrl(foto)} alt={product.nombre} />}</div>
        <div className="quick-add-info">
          <Link href={`/productos/${product.slug}`} className="quick-add-name">
            {product.nombre}
          </Link>
          {precio != null && <PriceBlock precio={precio} precioLista={precioLista} cfg={cfg} compacto />}
          <VariantPickers
            product={product}
            sel={{ ...sel, setMedida: (m) => { setAviso(false); sel.setMedida(m); } }}
            avisoMedida={aviso}
          />
          <AddToCart product={product} sel={sel} onAdded={onClose} onFaltaMedida={() => setAviso(true)} />
        </div>
      </div>
    </div>
  );
}
