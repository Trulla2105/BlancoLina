"use client";

import { useActionState } from "react";
import { guardarProducto } from "@/lib/actions/productos";
import type { Category, FormState, Linea } from "@/lib/types";

const initialState: FormState = {};

/** Alta de producto: datos básicos. Colores, medidas y fotos se cargan después. */
export function ProductForm({ categories, lineas }: { categories: Category[]; lineas: Linea[] }) {
  const [state, formAction, pending] = useActionState(guardarProducto, initialState);

  return (
    <form action={formAction} className="admin-form">
      {state.error && <div className="form-error">{state.error}</div>}

      <div className="row2">
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" required placeholder="Juego de Toalla y Toallón…" />
        </div>
        <div className="field">
          <label htmlFor="sku">Artículo / SKU</label>
          <input id="sku" name="sku" required placeholder="FV-250" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="category_id">Categoría</label>
          <select id="category_id" name="category_id" defaultValue="">
            <option value="">Sin categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="linea">Línea</label>
          <select id="linea" name="linea" defaultValue="">
            <option value="">Sin línea</option>
            {lineas.map((l) => (
              <option key={l.id} value={l.slug}>
                {l.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="marca">Marca</label>
        <input id="marca" name="marca" placeholder="Franco Valente" />
      </div>

      <div className="field">
        <label htmlFor="descripcion">Descripción</label>
        <textarea id="descripcion" name="descripcion" rows={4} />
      </div>

      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="activo" defaultChecked style={{ width: "auto" }} />
          Producto activo (visible en la tienda)
        </label>
      </div>

      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Creando…" : "Crear producto"}
      </button>
    </form>
  );
}
