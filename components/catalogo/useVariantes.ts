"use client";

import { useMemo, useState } from "react";
import type { Product, ProductColor, ProductVariant } from "@/lib/types";

export interface SeleccionVariante {
  color: ProductColor | null;
  setColorId: (id: string) => void;
  medidas: string[]; // medidas del producto (todas, en orden)
  muestraMedidas: boolean; // false si el producto tiene una sola medida "Única"
  medida: string | null;
  setMedida: (m: string) => void;
  variante: ProductVariant | null;
  stockDeMedida: (m: string) => number;
  colorAgotado: (c: ProductColor) => boolean;
}

function stockColor(c: ProductColor): number {
  return c.product_variants.reduce((s, v) => s + v.stock, 0);
}

/** Estado de la elección color + medida, con defaults que tienen stock. */
export function useVariantes(product: Product): SeleccionVariante {
  const colores = product.product_colors;
  const inicial = colores.find((c) => stockColor(c) > 0) ?? colores[0] ?? null;
  const [colorId, setColorIdState] = useState<string | null>(inicial?.id ?? null);

  const medidas = useMemo(() => {
    const vistas: string[] = [];
    for (const c of colores)
      for (const v of c.product_variants) if (!vistas.includes(v.medida)) vistas.push(v.medida);
    return vistas;
  }, [colores]);
  const muestraMedidas = !(medidas.length === 1 && medidas[0] === "Única");

  const color = colores.find((c) => c.id === colorId) ?? inicial;
  const primeraConStock = (c: ProductColor | null) =>
    c?.product_variants.find((v) => v.stock > 0)?.medida ?? c?.product_variants[0]?.medida ?? null;

  // Si hay una sola medida, queda elegida; si hay varias, el cliente elige.
  const [medida, setMedida] = useState<string | null>(
    muestraMedidas ? (medidas.length === 1 ? medidas[0] : null) : primeraConStock(inicial)
  );

  const variante =
    color && medida ? color.product_variants.find((v) => v.medida === medida) ?? null : null;

  function setColorId(id: string) {
    setColorIdState(id);
    const nuevo = colores.find((c) => c.id === id) ?? null;
    if (!muestraMedidas) {
      setMedida(primeraConStock(nuevo));
    } else if (medida && !nuevo?.product_variants.some((v) => v.medida === medida && v.stock > 0)) {
      // la medida elegida no existe o no tiene stock en el nuevo color
      setMedida(medidas.length === 1 ? medidas[0] : null);
    }
  }

  return {
    color,
    setColorId,
    medidas,
    muestraMedidas,
    medida,
    setMedida,
    variante,
    stockDeMedida: (m: string) =>
      color?.product_variants.find((v) => v.medida === m)?.stock ?? 0,
    colorAgotado: (c: ProductColor) => stockColor(c) === 0,
  };
}
