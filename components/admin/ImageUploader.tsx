"use client";

import { useRef, useState } from "react";
import { registrarImagenes } from "@/lib/actions/productos";
import { uploadImages } from "@/lib/upload";

/** Subida de fotos de producto: selección múltiple, directo a Storage. */
export function ImageUploader({ productId }: { productId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) {
      setError("Elegí una o más fotos.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);

    const { paths, errors } = await uploadImages(files, productId, (done, total) =>
      setStatus(`Subiendo ${Math.min(done + 1, total)} de ${total}…`)
    );

    if (paths.length > 0) {
      const result = await registrarImagenes(productId, paths);
      if (result.error) errors.push(result.error);
    }

    setBusy(false);
    setError(errors.length > 0 ? errors.join(" · ") : null);
    setStatus(
      paths.length > 0
        ? `${paths.length} foto${paths.length > 1 ? "s" : ""} subida${paths.length > 1 ? "s" : ""}.`
        : null
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      {status && !busy && <div className="form-ok">{status}</div>}
      <div className="upload-row">
        <input ref={inputRef} type="file" accept="image/*" multiple />
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={handleUpload}
        >
          {busy ? (status ?? "Subiendo…") : "Subir fotos"}
        </button>
      </div>
      <p className="upload-hint">
        Podés seleccionar varias a la vez (mantené apretado Ctrl, o tocá varias
        en el celular).
      </p>
    </div>
  );
}
