"use client";

import { useActionState } from "react";
import { crearColorPaleta, eliminarColorPaleta } from "@/lib/actions/paleta";
import type { FormState, PaletteColor } from "@/lib/types";

const initialState: FormState = {};

export function PaletaManager({ colores }: { colores: PaletteColor[] }) {
  const [state, formAction, pending] = useActionState(crearColorPaleta, initialState);

  return (
    <div className="variant-editor">
      <h2>Colores de la paleta</h2>
      <p className="upload-hint" style={{ marginBottom: 14 }}>
        Colores extra que se suman a la paleta al cargar un producto (aparecen
        en el grupo “Personalizados”).
      </p>

      {colores.length > 0 && (
        <div className="paleta-lista">
          {colores.map((c) => (
            <div key={c.id} className="paleta-lista-item">
              <span className="paleta-chip" style={{ background: c.hex }} />
              <span>{c.nombre}</span>
              <form action={eliminarColorPaleta.bind(null, c.id)}>
                <button type="submit" className="icon-btn" title="Quitar">
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <form action={formAction} style={{ marginTop: 14 }}>
        {state.error && <div className="form-error">{state.error}</div>}
        {state.ok && <div className="form-ok">{state.ok}</div>}
        <div className="upload-row">
          <input type="color" name="hex" defaultValue="#2f4a6b" className="color-input-native" />
          <input name="nombre" placeholder="Nombre del color (ej: Azul Dana)" required />
          <button type="submit" className="btn btn-sm btn-solid" disabled={pending}>
            {pending ? "…" : "Agregar"}
          </button>
        </div>
      </form>
    </div>
  );
}
