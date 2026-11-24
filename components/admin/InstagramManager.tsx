"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { guardarInstagramEmbed, registrarPost } from "@/lib/actions/instagram";
import { uploadImages } from "@/lib/upload";

/** Pegar el código del widget (LightWidget/Behold) que se actualiza solo. */
export function InstagramEmbedForm({ valor }: { valor: string }) {
  const [state, formAction, pending] = useActionState(guardarInstagramEmbed, {});

  return (
    <form action={formAction} className="admin-form">
      {state.error && <div className="form-error">{state.error}</div>}
      {state.ok && <div className="form-ok">{state.ok}</div>}
      <div className="field">
        <label>Código del widget de Instagram</label>
        <textarea
          name="html"
          rows={5}
          defaultValue={valor}
          placeholder='Pegá acá el código que te da LightWidget (empieza con <iframe ...)'
          style={{ fontFamily: "monospace", fontSize: 12 }}
        />
      </div>
      <button type="submit" className="btn btn-solid" disabled={pending}>
        {pending ? "Guardando…" : "Guardar widget"}
      </button>
    </form>
  );
}

export function InstagramUploader() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function handle() {
    const file = fileRef.current?.files?.[0];
    const link = linkRef.current?.value ?? "";
    if (!file) {
      setError("Elegí la imagen del posteo.");
      return;
    }
    if (!link.startsWith("https://")) {
      setError("Pegá el link del post (https://www.instagram.com/p/...).");
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    const { paths, errors } = await uploadImages([file], "instagram", undefined, 1080);
    if (paths.length > 0) {
      const res = await registrarPost(paths[0], link);
      if (res.error) errors.push(res.error);
    }
    setBusy(false);
    if (errors.length > 0) {
      setError(errors.join(" · "));
    } else {
      setOk("Posteo agregado.");
      if (fileRef.current) fileRef.current.value = "";
      if (linkRef.current) linkRef.current.value = "";
      router.refresh();
    }
  }

  return (
    <div className="admin-form">
      {error && <div className="form-error">{error}</div>}
      {ok && <div className="form-ok">{ok}</div>}
      <div className="field">
        <label>Imagen del posteo (captura o foto, cuadrada ideal)</label>
        <input ref={fileRef} type="file" accept="image/*" />
      </div>
      <div className="field">
        <label>Link del post de Instagram</label>
        <input ref={linkRef} placeholder="https://www.instagram.com/p/..." />
      </div>
      <button type="button" className="btn btn-solid" disabled={busy} onClick={handle}>
        {busy ? "Subiendo…" : "Agregar posteo"}
      </button>
    </div>
  );
}
