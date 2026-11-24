"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { ChevronIcon } from "@/components/ui/Icons";

/**
 * Galería de la ficha: miniaturas a la izquierda (en celular, abajo) y foto
 * grande. Controlada desde afuera para poder saltar a la foto del color.
 */
export function ProductGallery({
  imagenes,
  nombre,
  activa,
  onChange,
}: {
  imagenes: string[];
  nombre: string;
  activa: number;
  onChange: (i: number) => void;
}) {
  const touchX = useRef<number | null>(null);

  if (imagenes.length === 0) {
    return (
      <div className="gallery">
        <div className="gallery-main gallery-empty">Sin foto</div>
      </div>
    );
  }

  const ir = (d: number) => onChange((activa + d + imagenes.length) % imagenes.length);

  return (
    <div className="gallery">
      {imagenes.length > 1 && (
        <div className="gallery-thumbs">
          {imagenes.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={i === activa ? "gallery-thumb active" : "gallery-thumb"}
              onClick={() => onChange(i)}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div
        className="gallery-main"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <img src={imagenes[activa]} alt={nombre} />
        {imagenes.length > 1 && (
          <>
            <button type="button" className="gallery-arrow prev" aria-label="Foto anterior" onClick={() => ir(-1)}>
              <ChevronIcon size={18} dir="left" />
            </button>
            <button type="button" className="gallery-arrow next" aria-label="Foto siguiente" onClick={() => ir(1)}>
              <ChevronIcon size={18} dir="right" />
            </button>
            <span className="gallery-count">
              {activa + 1} / {imagenes.length}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
