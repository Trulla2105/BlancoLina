/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { eliminarImagen, moverImagen } from "@/lib/actions/productos";
import { getCategories, getLineas, getPaletteColors, getProductById } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase/env";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, lineas, paleta] = await Promise.all([
    getProductById(id),
    getCategories(),
    getLineas(),
    getPaletteColors(),
  ]);
  if (!product) notFound();

  return (
    <>
      {/* key: solo los ids. Si al guardar se crean colores o medidas nuevas, el
          editor se remonta para tomar sus ids reales; si solo cambian precios o
          stock, no se remonta y queda a la vista el aviso "Cambios guardados". */}
      <ProductEditor
        key={product.product_colors
          .map((c) => `${c.id}:${c.product_variants.map((v) => v.id).join(",")}`)
          .join("|")}
        product={product}
        categories={categories}
        lineas={lineas}
        paleta={paleta}
      />

      <div className="image-manager">
        <h2>Fotos del producto</h2>
        {product.product_images.length > 0 && (
          <div className="image-thumbs">
            {product.product_images.map((image, index) => (
              <div key={image.id} className="image-thumb">
                <div className="thumb-box">
                  <img src={publicImageUrl(image.url)} alt="" />
                </div>
                <div className="thumb-actions">
                  <form action={moverImagen.bind(null, image.id, product.id, "up")}>
                    <button type="submit" className="icon-btn" disabled={index === 0} title="Mover adelante">
                      ←
                    </button>
                  </form>
                  <form action={eliminarImagen.bind(null, image.id, product.id, image.url)}>
                    <button type="submit" className="icon-btn" title="Eliminar foto">
                      ✕
                    </button>
                  </form>
                  <form action={moverImagen.bind(null, image.id, product.id, "down")}>
                    <button type="submit" className="icon-btn" disabled={index === product.product_images.length - 1} title="Mover atrás">
                      →
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        <ImageUploader productId={product.id} />
        <p className="hint" style={{ marginTop: 10 }}>
          La primera foto es la de la tarjeta; la segunda aparece al pasar el mouse.
        </p>
      </div>
    </>
  );
}
