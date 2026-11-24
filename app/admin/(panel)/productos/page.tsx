import Link from "next/link";
import {
  ProductosAdminList,
  type AdminProductRow,
} from "@/components/admin/ProductosAdminList";
import { getProducts } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase/env";
import { allVariants } from "@/lib/types";

export default async function AdminProductosPage() {
  const products = await getProducts({ includeInactive: true });

  const rows: AdminProductRow[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    foto: p.product_images[0] ? publicImageUrl(p.product_images[0].url) : null,
    nombre: p.nombre,
    categoria: p.categories?.nombre ?? "",
    linea: p.linea ?? "",
    colores: p.product_colors.length,
    variantes: allVariants(p).length,
    stock: allVariants(p).reduce((s, v) => s + v.stock, 0),
    fotos: p.product_images.length,
    activo: p.activo,
    destacado: p.destacado,
  }));

  return (
    <>
      <div className="admin-head">
        <h1>Productos ({rows.length})</h1>
        <Link href="/admin/productos/nuevo" className="btn btn-solid btn-sm">
          Nuevo producto
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="empty-note">
          Todavía no hay productos. Cargá el primero con “Nuevo producto”.
        </div>
      ) : (
        <ProductosAdminList products={rows} />
      )}
    </>
  );
}
