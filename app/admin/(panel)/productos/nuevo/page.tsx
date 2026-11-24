import { ProductForm } from "@/components/admin/ProductForm";
import { getCategories, getLineas } from "@/lib/queries";

export default async function NuevoProductoPage() {
  const [categories, lineas] = await Promise.all([getCategories(), getLineas()]);
  return (
    <>
      <h1>Nuevo producto</h1>
      <ProductForm categories={categories} lineas={lineas} />
      <p style={{ fontSize: 13, color: "var(--gray)", marginTop: 20 }}>
        Después de crearlo vas a poder cargar colores, medidas, precios, stock y fotos.
      </p>
    </>
  );
}
