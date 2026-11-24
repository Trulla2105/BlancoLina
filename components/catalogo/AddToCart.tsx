"use client";

import { useState } from "react";
import { QtyStepper } from "@/components/cart/QtyStepper";
import { useCart } from "@/lib/cart/CartContext";
import { precioVariante } from "@/lib/precios";
import { publicImageUrl } from "@/lib/supabase/env";
import type { Product } from "@/lib/types";
import type { SeleccionVariante } from "./useVariantes";

/** Cantidad + "Agregar al carrito" para la variante elegida. */
export function AddToCart({
  product,
  sel,
  onAdded,
  onFaltaMedida,
}: {
  product: Product;
  sel: SeleccionVariante;
  onAdded?: () => void;
  onFaltaMedida?: () => void;
}) {
  const { addItem, items } = useCart();
  const [qty, setQty] = useState(1);
  const v = sel.variante;
  const enCarrito = v ? items.find((i) => i.variantId === v.id)?.cantidad ?? 0 : 0;
  const disponible = v ? Math.max(0, Math.min(99, v.stock) - enCarrito) : 0;
  const agotado = v != null && v.stock === 0;

  function agregar() {
    if (!v) {
      onFaltaMedida?.();
      return;
    }
    if (disponible <= 0) return;
    const imagen = sel.color?.foto ?? product.product_images[0]?.url ?? null;
    addItem({
      variantId: v.id,
      slug: product.slug,
      nombre: product.nombre,
      color: sel.color?.nombre ?? "",
      medida: v.medida,
      etiquetaMedida: product.etiqueta_medida,
      imagen: imagen ? publicImageUrl(imagen) : null,
      precio: precioVariante(v),
      stock: v.stock,
      cantidad: Math.min(qty, disponible),
    });
    setQty(1);
    onAdded?.();
  }

  return (
    <div className="add-to-cart">
      {v && v.stock > 0 && v.stock <= 3 && (
        <div className="stock-warn">¡Últimas {v.stock === 1 ? "unidad" : `${v.stock} unidades`}!</div>
      )}
      <div className="add-row">
        <QtyStepper value={qty} onChange={setQty} max={Math.max(1, disponible)} />
        <button
          type="button"
          className="btn btn-add"
          onClick={agregar}
          disabled={agotado || (v != null && disponible <= 0)}
        >
          {agotado ? "Sin stock" : v != null && disponible <= 0 ? "Ya tenés todo el stock" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}
