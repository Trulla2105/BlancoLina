"use client";

import { useEffect, useRef } from "react";
import { InstagramIcon } from "@/components/ui/Icons";
import { perfilInstagram } from "@/lib/contacto";

/**
 * Renderiza el widget de Instagram de cualquier proveedor (Behold,
 * SnapWidget, LightWidget…). Como React no ejecuta los <script> insertados
 * con innerHTML, replicamos lo que hace el navegador: montamos el HTML y
 * volvemos a crear cada <script> (con src o inline) para que corra.
 */
export function InstagramEmbed({ html, instagram = "" }: { html: string; instagram?: string }) {
  const perfil = perfilInstagram(instagram);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    const scripts = Array.from(tmp.querySelectorAll("script"));
    scripts.forEach((s) => s.remove());

    // El contenedor primero (los widgets buscan su div al ejecutarse)
    container.innerHTML = tmp.innerHTML;

    // Luego ejecutar cada script recreándolo
    scripts.forEach((old) => {
      const s = document.createElement("script");
      if (old.type) s.type = old.type;
      if (old.src) {
        s.src = old.src;
        s.async = true;
      } else {
        s.textContent = old.textContent;
      }
      document.body.appendChild(s);
    });
  }, [html]);

  return (
    <section className="ig-section">
      <div className="ig-head">
        <InstagramIcon size={18} />
        <span>Seguinos en Instagram</span>
        {perfil && (
          <a href={perfil.url} target="_blank" rel="noopener noreferrer" className="ig-user">
            {perfil.usuario}
          </a>
        )}
      </div>
      <div ref={ref} className="ig-embed" />
    </section>
  );
}
