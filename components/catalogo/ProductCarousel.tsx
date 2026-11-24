"use client";

import { useRef } from "react";
import { ChevronIcon } from "@/components/ui/Icons";
import type { ConfigComercial, Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

/**
 * Carrusel horizontal de productos: 4 por pantalla en computadora, 2 en
 * celular (se desliza con el dedo). Scroll-snap para que quede alineado.
 */
export function ProductCarousel({ products, cfg }: { products: Product[]; cfg: ConfigComercial }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  if (products.length === 0) return <div className="empty-note">Todavía no hay productos cargados.</div>;

  return (
    <div className="pcar">
      <button type="button" className="round-arrow pcar-prev" aria-label="Anterior" onClick={() => scroll(-1)}>
        <ChevronIcon size={18} dir="left" />
      </button>
      <div className="pcar-track" ref={trackRef}>
        {products.map((product) => (
          <div className="pcar-item" key={product.id}>
            <ProductCard product={product} cfg={cfg} />
          </div>
        ))}
      </div>
      <button type="button" className="round-arrow pcar-next" aria-label="Siguiente" onClick={() => scroll(1)}>
        <ChevronIcon size={18} dir="right" />
      </button>
    </div>
  );
}
