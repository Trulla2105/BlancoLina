"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setImagenTaxonomia } from "@/lib/actions/taxonomias";
import { publicImageUrl } from "@/lib/supabase/env";
import { uploadImages } from "@/lib/upload";

/** Foto de una categoría o línea: subir, ver y quitar. */
export function TaxonomiaImagen({
  tabla,
  id,
  imagen,
}: {
  tabla: "categories" | "lineas";
  id: string;
  imagen: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const { paths, errors } = await uploadImages([file], `${tabla}/${id}`, undefined, 1400);
    if (paths[0]) {
      const r = await setImagenTaxonomia(tabla, id, paths[0]);
      if (r.error) errors.push(r.error);
    }
    setBusy(false);
    if (errors.length) setError(errors.join(" · "));
    router.refresh();
  }

  async function quitar() {
    const r = await setImagenTaxonomia(tabla, id, null);
    if (r.error) setError(r.error);
    router.refresh();
  }

  return (
    <div className="tax-img">
      {imagen ? <img src={publicImageUrl(imagen)} alt="" /> : <span className="tax-img-empty">Sin foto</span>}
      <label className="btn btn-sm">
        {busy ? "Subiendo…" : imagen ? "Cambiar" : "Subir foto"}
        <input type="file" accept="image/*" hidden onChange={(e) => subir(e.target.files?.[0])} />
      </label>
      {imagen && (
        <button type="button" className="icon-btn" title="Quitar foto" onClick={quitar}>
          ✕
        </button>
      )}
      {error && <span className="form-error-inline">{error}</span>}
    </div>
  );
}
