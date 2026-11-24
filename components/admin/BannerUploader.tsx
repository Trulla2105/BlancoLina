"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { registrarBanner } from "@/lib/actions/banners";
import { uploadImages } from "@/lib/upload";

export function BannerUploader() {
  const router = useRouter();
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [boton, setBoton] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (u: string | null) => void
  ) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setStatus(null);
    setError(null);
  }

  async function handleUpload() {
    if (!desktopFile) {
      setError("Elegí la foto de computadora (es la principal).");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);

    const errors: string[] = [];
    const desk = await uploadImages([desktopFile], "banners", undefined, 1920);
    errors.push(...desk.errors);

    let pathMobile: string | null = null;
    if (mobileFile && errors.length === 0) {
      const mob = await uploadImages([mobileFile], "banners", undefined, 1920);
      errors.push(...mob.errors);
      pathMobile = mob.paths[0] ?? null;
    }

    if (desk.paths.length > 0 && errors.length === 0) {
      const result = await registrarBanner(desk.paths[0], pathMobile, titulo, link, subtitulo, boton);
      if (result.error) errors.push(result.error);
    }

    setBusy(false);
    if (errors.length > 0) {
      setError(errors.join(" · "));
      return;
    }
    // Limpiar y refrescar la lista de arriba
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(null);
    setMobilePreview(null);
    setTitulo("");
    setLink("");
    if (desktopRef.current) desktopRef.current.value = "";
    if (mobileRef.current) mobileRef.current.value = "";
    setStatus("¡Banner subido! Aparece en la lista de arriba.");
    router.refresh();
  }

  return (
    <div className="admin-form">
      {error && <div className="form-error">{error}</div>}
      {status && <div className="form-ok">{status}</div>}

      <div className="banner-dropzones">
        {/* Computadora */}
        <div>
          <label className="dz dz-desktop" htmlFor="bn-desktop">
            {desktopPreview ? (
              <img src={desktopPreview} alt="Vista previa computadora" />
            ) : (
              <span className="dz-empty">
                <span className="dz-icon">🖥️</span>
                Tocá para elegir la foto
                <small>Horizontal · ideal 1920 × 750</small>
              </span>
            )}
          </label>
          <div className="dz-caption">
            <strong>1. Foto para computadora</strong> (obligatoria)
            {desktopPreview && (
              <button
                type="button"
                className="dz-clear"
                onClick={() => {
                  setDesktopFile(null);
                  setDesktopPreview(null);
                  if (desktopRef.current) desktopRef.current.value = "";
                }}
              >
                Quitar
              </button>
            )}
          </div>
          <input
            ref={desktopRef}
            id="bn-desktop"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => pick(e, setDesktopFile, setDesktopPreview)}
          />
        </div>

        {/* Celular */}
        <div>
          <label className="dz dz-phone" htmlFor="bn-mobile">
            {mobilePreview ? (
              <img src={mobilePreview} alt="Vista previa celular" />
            ) : (
              <span className="dz-empty">
                <span className="dz-icon">📱</span>
                Tocá para elegir la foto
                <small>Vertical · ideal 1080 × 1620</small>
              </span>
            )}
          </label>
          <div className="dz-caption">
            <strong>2. Foto para celular</strong> (opcional)
            {mobilePreview && (
              <button
                type="button"
                className="dz-clear"
                onClick={() => {
                  setMobileFile(null);
                  setMobilePreview(null);
                  if (mobileRef.current) mobileRef.current.value = "";
                }}
              >
                Quitar
              </button>
            )}
          </div>
          <input
            ref={mobileRef}
            id="bn-mobile"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => pick(e, setMobileFile, setMobilePreview)}
          />
        </div>
      </div>

      <p className="upload-hint" style={{ marginBottom: 18 }}>
        Si no subís la foto de celular, en el teléfono se muestra la de
        computadora (sin recortar). Subí la vertical solo si querés el efecto
        pantalla completa en el celular.
      </p>

      <div className="row2">
        <div className="field">
          <label htmlFor="bn-titulo">Título sobre la foto (opcional)</label>
          <input
            id="bn-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Toallas 100% algodón"
          />
        </div>
        <div className="field">
          <label htmlFor="bn-sub">Bajada (opcional)</label>
          <input
            id="bn-sub"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            placeholder="Líneas Liviana, Pesada y Premium"
          />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="bn-boton">Texto del botón (opcional)</label>
          <input
            id="bn-boton"
            value={boton}
            onChange={(e) => setBoton(e.target.value)}
            placeholder="Ver más"
          />
        </div>
        <div className="field">
          <label htmlFor="bn-link">Link al tocar el banner (opcional)</label>
          <input
            id="bn-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/productos"
          />
        </div>
      </div>

      <button
        type="button"
        className="btn btn-solid"
        disabled={busy}
        onClick={handleUpload}
      >
        {busy ? "Subiendo…" : "Subir banner"}
      </button>
    </div>
  );
}
