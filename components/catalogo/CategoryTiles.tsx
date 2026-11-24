/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { publicImageUrl } from "@/lib/supabase/env";
import type { Category } from "@/lib/types";

/** "Comprá por categoría": fotos cuadradas con el nombre encima. */
export function CategoryTiles({ categories }: { categories: Category[] }) {
  const conFoto = categories.filter((c) => c.imagen);
  if (conFoto.length === 0) return null;
  return (
    <div className="cat-tiles">
      {conFoto.map((c) => (
        <Link key={c.id} href={`/productos?categoria=${c.slug}`} className="cat-tile">
          <img src={publicImageUrl(c.imagen as string)} alt="" loading="lazy" />
          <span>{c.nombre}</span>
        </Link>
      ))}
    </div>
  );
}
