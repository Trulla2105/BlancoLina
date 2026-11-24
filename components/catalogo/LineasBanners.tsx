/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { publicImageUrl } from "@/lib/supabase/env";
import type { Linea } from "@/lib/types";

/** Banners de las líneas (Liviana / Pesada / Premium) con "Ver más". */
export function LineasBanners({ lineas }: { lineas: Linea[] }) {
  const conFoto = lineas.filter((l) => l.imagen);
  if (conFoto.length === 0) return null;
  return (
    <div className="lineas">
      {conFoto.map((l) => (
        <Link key={l.id} href={`/productos?linea=${l.slug}`} className="linea">
          <img src={publicImageUrl(l.imagen as string)} alt="" loading="lazy" />
          <div className="linea-txt">
            <h3>{l.nombre}</h3>
            {l.descripcion && <p>{l.descripcion}</p>}
            <span className="btn-pill">Ver más</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
