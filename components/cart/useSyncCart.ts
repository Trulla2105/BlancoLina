"use client";

import { useEffect, useRef, useState } from "react";
import { estadoVariantes } from "@/lib/actions/tienda";
import { useCart } from "@/lib/cart/CartContext";

/** Al abrir carrito o checkout, trae precio y stock reales y ajusta el carrito. */
export function useSyncCart(): { listo: boolean; avisos: string[] } {
  const { items, mounted, sincronizar } = useCart();
  const [listo, setListo] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);
  const hecho = useRef(false);

  useEffect(() => {
    if (!mounted || hecho.current) return;
    hecho.current = true;
    const ids = items.map((i) => i.variantId);
    if (ids.length === 0) {
      setListo(true);
      return;
    }
    estadoVariantes(ids)
      .then((estados) => setAvisos(sincronizar(estados)))
      .catch(() => {
        /* sin conexión: se sigue con lo guardado; la base valida al comprar */
      })
      .finally(() => setListo(true));
  }, [mounted, items, sincronizar]);

  return { listo, avisos };
}
