"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import type { FormState } from "@/lib/types";

function revalidateCatalog(productSlug?: string) {
  revalidatePath("/");
  revalidatePath("/productos");
  if (productSlug) revalidatePath(`/productos/${productSlug}`);
  revalidatePath("/admin/productos");
}

// ---------- productos ----------

export async function guardarProducto(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };

  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const marca = String(formData.get("marca") ?? "").trim();
  const linea = String(formData.get("linea") ?? "").trim();
  const activo = formData.get("activo") === "on";

  if (!nombre || !sku) return { error: "Nombre y artículo/SKU son obligatorios." };

  const row = {
    nombre,
    sku,
    category_id: categoryId || null,
    descripcion: descripcion || null,
    marca: marca || null,
    linea: linea || null,
    activo,
  };

  if (id) {
    // La URL (slug) no se regenera al editar: cambiaría los links ya
    // compartidos y puede chocar con el slug de otro producto.
    const { data, error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id)
      .select("id");
    if (error) {
      if (error.code === "23505")
        return { error: "Ya existe otro producto con ese artículo/SKU." };
      return { error: `No se pudo guardar: ${error.message}` };
    }
    if (!data || data.length === 0) {
      // El update no tocó ninguna fila: RLS lo filtró o el id no existe.
      return {
        error:
          "El cambio no se aplicó: tu sesión no tiene permisos de admin sobre este producto. Cerrá sesión y volvé a entrar.",
      };
    }
    revalidateCatalog();
    revalidatePath(`/admin/productos/${id}`);
    return { ok: "Producto guardado." };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({ ...row, slug: slugify(nombre) })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505")
      return { error: "Ya existe un producto con ese nombre o artículo/SKU." };
    return { error: `No se pudo crear: ${error.message}` };
  }

  revalidateCatalog();
  redirect(`/admin/productos/${data.id}`);
}

/** Renombra un producto desde el listado (sin abrir su ficha). */
export async function renombrarProducto(
  id: string,
  nombre: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };
  const n = nombre.trim();
  if (!n) return { error: "El nombre no puede quedar vacío." };

  const { data, error } = await supabase
    .from("products")
    .update({ nombre: n })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "No se pudo guardar (revisá tu sesión de admin)." };

  revalidateCatalog();
  revalidatePath("/admin/productos");
  return {};
}

export async function alternarActivo(id: string, activo: boolean): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("products").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCatalog();
}

/** Marca / desmarca un producto como destacado (carrusel "Nuevos ingresos"). */
export async function alternarDestacado(id: string, destacado: boolean): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("products").update({ destacado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCatalog();
}

/**
 * Reordena la galería a mano: intercambia el `orden` del producto con el de su
 * vecino ("up" = hacia adelante = orden mayor; "down" = hacia atrás).
 */
export async function moverProducto(id: string, dir: "up" | "down"): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data: cur } = await supabase
    .from("products")
    .select("id, orden")
    .eq("id", id)
    .single();
  if (!cur) return;

  let vecinoQ = supabase.from("products").select("id, orden");
  vecinoQ =
    dir === "up"
      ? vecinoQ.gt("orden", cur.orden).order("orden", { ascending: true })
      : vecinoQ.lt("orden", cur.orden).order("orden", { ascending: false });
  const { data: vecino } = await vecinoQ.limit(1).maybeSingle();
  if (!vecino) return; // ya está en el extremo

  await supabase.from("products").update({ orden: vecino.orden }).eq("id", cur.id);
  await supabase.from("products").update({ orden: cur.orden }).eq("id", vecino.id);
  revalidateCatalog();
  revalidatePath("/admin/productos");
}

/** Manda un producto al frente de la galería (le da el orden más alto + 1). */
export async function moverProductoAlFrente(id: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data: top } = await supabase
    .from("products")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nuevo = (top?.orden ?? 0) + 1;
  const { error } = await supabase.from("products").update({ orden: nuevo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCatalog();
  revalidatePath("/admin/productos");
}

export async function eliminarProducto(id: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    throw new Error(
      `No se pudo eliminar (¿tiene pedidos asociados? Desactivalo en su lugar): ${error.message}`
    );
  }
  revalidateCatalog();
  redirect("/admin/productos");
}

// ---------- colores, medidas, precios y stock ----------

/** Foto propia de un color (path en el bucket, o null para quitarla). */
export async function setColorFoto(
  colorId: string,
  productId: string,
  path: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };
  const { data, error } = await supabase
    .from("product_colors")
    .update({ foto: path })
    .eq("id", colorId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "No se guardó: revisá tu sesión de admin." };
  revalidateCatalog();
  revalidatePath(`/admin/productos/${productId}`);
  return {};
}

export interface VariantInput {
  id: string | null;
  medida: string;
  stock: number;
  precio: number;
  oferta: number | null;
}

export interface ColorInput {
  id: string | null;
  nombre: string;
  hex: string | null;
  variants: VariantInput[];
}

export interface ProductFields {
  nombre: string;
  sku: string;
  categoryId: string;
  marca: string;
  linea: string;
  descripcion: string;
  etiquetaColor: string;
  etiquetaMedida: string;
  activo: boolean;
  destacado: boolean;
  ocultarNuevo: boolean;
}

/**
 * Guarda TODO el producto de una sola vez: datos generales, colores y sus
 * medidas con precio y stock (altas, ediciones y bajas). Un único botón.
 */
export async function guardarProductoCompleto(
  productId: string,
  fields: ProductFields,
  colors: ColorInput[],
  deletedColorIds: string[],
  deletedVariantIds: string[]
): Promise<FormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };

  const nombre = fields.nombre.trim();
  const sku = fields.sku.trim();
  if (!nombre || !sku) return { error: "Nombre y artículo/SKU son obligatorios." };

  // Validar antes de tocar la base
  for (const c of colors) {
    if (!c.nombre.trim()) return { error: "Hay un color sin nombre." };
    const medidas = new Set<string>();
    for (const v of c.variants) {
      const m = v.medida.trim() || "Única";
      if (medidas.has(m)) return { error: `"${m}" está repetido en ${c.nombre}.` };
      medidas.add(m);
      if (!Number.isFinite(v.stock) || v.stock < 0 || !Number.isInteger(v.stock))
        return { error: `Stock inválido (${c.nombre}, ${m}).` };
      if (!Number.isFinite(v.precio) || v.precio <= 0)
        return { error: `Falta el precio (${c.nombre}, ${m}).` };
      if (v.oferta !== null && (!Number.isFinite(v.oferta) || v.oferta <= 0 || v.oferta >= v.precio))
        return { error: `La oferta de ${c.nombre} ${m} tiene que ser menor al precio.` };
    }
  }

  // 1) Datos del producto
  const { data: prodData, error: prodErr } = await supabase
    .from("products")
    .update({
      nombre,
      sku,
      category_id: fields.categoryId || null,
      marca: fields.marca.trim() || null,
      linea: fields.linea || null,
      descripcion: fields.descripcion.trim() || null,
      etiqueta_color: fields.etiquetaColor.trim() || "Color",
      etiqueta_medida: fields.etiquetaMedida.trim() || "Medida",
      activo: fields.activo,
      destacado: fields.destacado,
      ocultar_nuevo: fields.ocultarNuevo,
    })
    .eq("id", productId)
    .select("id");
  if (prodErr) {
    if (prodErr.code === "23505") return { error: "Ya existe otro producto con ese artículo/SKU." };
    return { error: `No se pudo guardar el producto: ${prodErr.message}` };
  }
  if (!prodData || prodData.length === 0)
    return { error: "El cambio no se aplicó: revisá tu sesión de admin." };

  // 2) Bajas (las variantes con pedidos quedan desvinculadas del pedido, que guarda su copia)
  if (deletedVariantIds.length > 0)
    await supabase.from("product_variants").delete().in("id", deletedVariantIds);
  if (deletedColorIds.length > 0)
    await supabase.from("product_colors").delete().in("id", deletedColorIds);

  // 3) Colores + medidas
  for (const [orden, c] of colors.entries()) {
    let colorId = c.id;
    if (colorId) {
      const { error } = await supabase
        .from("product_colors")
        .update({ nombre: c.nombre.trim(), hex: c.hex, orden })
        .eq("id", colorId);
      if (error) {
        if (error.code === "23505") return { error: `El color ${c.nombre} está repetido.` };
        return { error: `No se pudo guardar el color ${c.nombre}: ${error.message}` };
      }
    } else {
      const { data, error } = await supabase
        .from("product_colors")
        .insert({ product_id: productId, nombre: c.nombre.trim(), hex: c.hex, orden })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") return { error: `El color ${c.nombre} ya existe.` };
        return { error: `No se pudo crear el color ${c.nombre}: ${error.message}` };
      }
      colorId = data.id;
    }

    for (const v of c.variants) {
      const fila = {
        medida: v.medida.trim() || "Única",
        stock: v.stock,
        precio: v.precio,
        precio_oferta: v.oferta,
      };
      if (v.id) {
        const { error } = await supabase.from("product_variants").update(fila).eq("id", v.id);
        if (error) return { error: `No se pudo guardar ${c.nombre} ${fila.medida}: ${error.message}` };
      } else {
        const { error } = await supabase
          .from("product_variants")
          .insert({ ...fila, product_id: productId, color_id: colorId });
        if (error) {
          if (error.code === "23505") return { error: `${fila.medida} está duplicado en ${c.nombre}.` };
          return { error: `No se pudo crear ${c.nombre} ${fila.medida}: ${error.message}` };
        }
      }
    }
  }

  revalidateCatalog();
  revalidatePath(`/admin/productos/${productId}`);
  return { ok: "Cambios guardados." };
}

// ---------- imágenes ----------

/**
 * Registra fotos ya subidas a Storage desde el navegador (subida directa,
 * sin pasar por el server: evita el límite de tamaño de las functions).
 */
export async function registrarImagenes(
  productId: string,
  paths: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };
  if (paths.length === 0) return {};

  const { data: maxRow } = await supabase
    .from("product_images")
    .select("orden")
    .eq("product_id", productId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const base = (maxRow?.orden ?? -1) + 1;
  const rows = paths.map((path, i) => ({
    product_id: productId,
    url: path,
    orden: base + i,
  }));

  const { error } = await supabase.from("product_images").insert(rows);
  if (error) return { error: `No se pudieron registrar las fotos: ${error.message}` };

  revalidateCatalog();
  revalidatePath(`/admin/productos/${productId}`);
  return {};
}

export async function eliminarImagen(
  id: string,
  productId: string,
  path: string
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // Las fotos de ejemplo (/seed/…) viven en el repo, no en Storage.
  if (!path.startsWith("/") && !path.startsWith("http")) {
    await supabase.storage.from("product-images").remove([path]);
  }

  revalidateCatalog();
  revalidatePath(`/admin/productos/${productId}`);
}

/** Mueve una imagen un lugar hacia adelante o atrás intercambiando `orden`. */
export async function moverImagen(
  id: string,
  productId: string,
  direction: "up" | "down"
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data: images } = await supabase
    .from("product_images")
    .select("id, orden")
    .eq("product_id", productId)
    .order("orden");
  if (!images) return;

  const index = images.findIndex((img) => img.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= images.length) return;

  const a = images[index];
  const b = images[swapWith];
  await supabase.from("product_images").update({ orden: b.orden }).eq("id", a.id);
  await supabase.from("product_images").update({ orden: a.orden }).eq("id", b.id);

  revalidateCatalog();
  revalidatePath(`/admin/productos/${productId}`);
}
