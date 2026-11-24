"use client";

/* eslint-disable @next/next/no-img-element */
import { publicImageUrl } from "@/lib/supabase/env";
import type { Product } from "@/lib/types";
import type { SeleccionVariante } from "./useVariantes";

/** Selector de color (foto o chip) y de medida/talle/letra. */
export function VariantPickers({
  product,
  sel,
  avisoMedida,
}: {
  product: Product;
  sel: SeleccionVariante;
  avisoMedida?: boolean;
}) {
  const colores = product.product_colors;
  const conFoto = colores.some((c) => c.foto);

  return (
    <div className="pickers">
      {colores.length > 0 && (
        <div className="picker">
          <div className="picker-label">
            {product.etiqueta_color}: <strong>{sel.color?.nombre}</strong>
          </div>
          <div className={conFoto ? "swatches swatches-photo" : "swatches"}>
            {colores.map((c) => {
              const agotado = sel.colorAgotado(c);
              const activo = c.id === sel.color?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`swatch${activo ? " active" : ""}${agotado ? " out" : ""}`}
                  onClick={() => sel.setColorId(c.id)}
                  title={agotado ? `${c.nombre} (sin stock)` : c.nombre}
                  aria-label={c.nombre}
                  aria-pressed={activo}
                >
                  <span className="swatch-box" style={c.hex ? { background: c.hex } : undefined}>
                    {c.foto && <img src={publicImageUrl(c.foto)} alt="" loading="lazy" />}
                  </span>
                  {conFoto && <span className="swatch-name">{c.nombre}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sel.muestraMedidas && (
        <div className="picker">
          <div className="picker-label">
            {product.etiqueta_medida}: <strong>{sel.medida ?? "elegí una opción"}</strong>
          </div>
          <div className="sizes">
            {sel.medidas.map((m) => {
              const stock = sel.stockDeMedida(m);
              return (
                <button
                  key={m}
                  type="button"
                  className={`size${sel.medida === m ? " active" : ""}`}
                  disabled={stock === 0}
                  onClick={() => sel.setMedida(m)}
                  aria-pressed={sel.medida === m}
                >
                  {m}
                </button>
              );
            })}
          </div>
          {avisoMedida && !sel.medida && (
            <div className="picker-warn">Elegí {product.etiqueta_medida.toLowerCase()} para agregar al carrito.</div>
          )}
        </div>
      )}
    </div>
  );
}
