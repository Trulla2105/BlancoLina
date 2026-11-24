"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category, Linea } from "@/lib/types";

type Activos = {
  categoria?: string;
  linea?: string;
  color?: string;
  min?: string;
  max?: string;
  buscar?: string;
  orden?: string;
};

function href(activos: Activos, cambios: Partial<Activos>): string {
  const merged: Record<string, string | undefined> = { ...activos, ...cambios };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/productos?${s}` : "/productos";
}

/** Filtros del listado: categoría, línea, color y precio. En celular, desplegables. */
export function CatalogFilters({
  categories,
  lineas,
  colores,
  activos,
}: {
  categories: Category[];
  lineas: Linea[];
  colores: { nombre: string; hex: string | null }[];
  activos: Activos;
}) {
  const [abierto, setAbierto] = useState(false);
  const hayFiltros = Boolean(activos.categoria || activos.linea || activos.color || activos.min || activos.max);

  return (
    <aside className={abierto ? "filters open" : "filters"}>
      <button type="button" className="filters-toggle" onClick={() => setAbierto((v) => !v)}>
        Filtrar {hayFiltros ? "·" : ""} {abierto ? "▲" : "▼"}
      </button>
      <div className="filters-body">
        {hayFiltros && (
          <Link href={href({ buscar: activos.buscar, orden: activos.orden }, {})} className="filters-clear">
            Limpiar filtros
          </Link>
        )}

        <div className="filter-group">
          <h4>Categorías</h4>
          <ul>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={href(activos, { categoria: activos.categoria === c.slug ? undefined : c.slug })}
                  className={activos.categoria === c.slug ? "active" : undefined}
                >
                  {c.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {lineas.length > 0 && (
          <div className="filter-group">
            <h4>Línea</h4>
            <ul>
              {lineas.map((l) => (
                <li key={l.id}>
                  <Link
                    href={href(activos, { linea: activos.linea === l.slug ? undefined : l.slug })}
                    className={activos.linea === l.slug ? "active" : undefined}
                  >
                    {l.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {colores.length > 0 && (
          <div className="filter-group">
            <h4>Color</h4>
            <ul className="filter-colors">
              {colores.map((c) => {
                const activo = activos.color?.toLowerCase() === c.nombre.toLowerCase();
                return (
                  <li key={c.nombre}>
                    <Link
                      href={href(activos, { color: activo ? undefined : c.nombre })}
                      className={activo ? "active" : undefined}
                    >
                      <span className="dot" style={c.hex ? { background: c.hex } : undefined} />
                      {c.nombre}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="filter-group">
          <h4>Precio</h4>
          <form action="/productos" className="filter-price">
            {Object.entries(activos).map(([k, v]) =>
              v && k !== "min" && k !== "max" ? <input key={k} type="hidden" name={k} value={v} /> : null
            )}
            <input name="min" inputMode="numeric" placeholder="Desde" defaultValue={activos.min} aria-label="Precio desde" />
            <input name="max" inputMode="numeric" placeholder="Hasta" defaultValue={activos.max} aria-label="Precio hasta" />
            <button type="submit" aria-label="Aplicar precio">›</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
