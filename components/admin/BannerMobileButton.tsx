"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { setBannerMobile } from "@/lib/actions/banners";
import { uploadImages } from "@/lib/upload";

/** Sube y asigna (o reemplaza) la foto de celular de un banner existente. */
export function BannerMobileButton({
  bannerId,
  hasMobile,
}: {
  bannerId: string;
  hasMobile: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const { paths, errors } = await uploadImages([file], "banners", undefined, 1920);
    if (paths.length > 0) {
      const res = await setBannerMobile(bannerId, paths[0]);
      if (res.error) errors.push(res.error);
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (errors.length > 0) setError(errors.join(" · "));
    else router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? "…" : hasMobile ? "Cambiar foto cel." : "Agregar foto cel."}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handle}
      />
      {error && (
        <span style={{ color: "var(--accent)", fontSize: 11 }}>{error}</span>
      )}
    </>
  );
}
