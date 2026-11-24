"use client";

import { useState } from "react";
import type { ConfigComercial, Product } from "@/lib/types";
import { ProductCarousel } from "./ProductCarousel";

/** "Los más vendidos" con pestañas por categoría (Todos, Juegos, Batas…). */
export function TabbedProducts({ products, cfg }: { products: Product[]; cfg: ConfigComercial }) {
  const tabs: { slug: string; nombre: string }[] = [];
  for (const p of products) {
    const c = p.categories;
    if (c && !tabs.some((t) => t.slug === c.slug)) tabs.push({ slug: c.slug, nombre: c.nombre });
  }
  const [activa, setActiva] = useState<string | null>(null);
  const visibles = activa ? products.filter((p) => p.categories?.slug === activa) : products;

  return (
    <>
      {tabs.length > 1 && (
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activa === null}
            className={activa === null ? "tab active" : "tab"}
            onClick={() => setActiva(null)}
          >
            Todos
          </button>
          {tabs.map((t) => (
            <button
              key={t.slug}
              type="button"
              role="tab"
              aria-selected={activa === t.slug}
              className={activa === t.slug ? "tab active" : "tab"}
              onClick={() => setActiva(t.slug)}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      )}
      <ProductCarousel products={visibles} cfg={cfg} />
    </>
  );
}
