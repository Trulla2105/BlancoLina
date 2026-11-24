"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import type { FormState } from "@/lib/types";

type Tabla = "categories" | "lineas";

function revalidateTaxonomias() {
  revalidatePath("/", "layout"); // nav, rail y filtros aparecen en todo el sitio
}

async function crear(tabla: Tabla, nombre: string): Promise<FormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };
  if (!nombre) return { error: "Escribí un nombre." };

  const { data: maxRow } = await supabase
    .from(tabla)
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from(tabla).insert({
    nombre,
    slug: slugify(nombre),
    orden: (maxRow?.orden ?? 0) + 1,
  });
  if (error) {
    if (error.code === "23505") return { error: "Ya existe uno con ese nombre." };
    return { error: error.message };
  }
  revalidateTaxonomias();
  return { ok: "Creado." };
}

async function eliminar(tabla: Tabla, id: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  // Los productos que lo usaban quedan sin categoría/línea (FK on delete set null)
  const { error } = await supabase.from(tabla).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTaxonomias();
}

async function mover(tabla: Tabla, id: string, direction: "up" | "down"): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data: rows } = await supabase.from(tabla).select("id, orden").order("orden");
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await supabase.from(tabla).update({ orden: b.orden }).eq("id", a.id);
  await supabase.from(tabla).update({ orden: a.orden }).eq("id", b.id);
  revalidateTaxonomias();
}

export async function crearCategoria(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  return crear("categories", String(formData.get("nombre") ?? "").trim());
}

export async function eliminarCategoria(id: string): Promise<void> {
  return eliminar("categories", id);
}

export async function moverCategoria(id: string, dir: "up" | "down"): Promise<void> {
  return mover("categories", id, dir);
}

export async function crearLinea(_prev: FormState, formData: FormData): Promise<FormState> {
  return crear("lineas", String(formData.get("nombre") ?? "").trim());
}

export async function eliminarLinea(id: string): Promise<void> {
  return eliminar("lineas", id);
}

export async function moverLinea(id: string, dir: "up" | "down"): Promise<void> {
  return mover("lineas", id, dir);
}

/** Foto de la tarjeta de categoría o del banner de línea (path del bucket o null). */
export async function setImagenTaxonomia(
  tabla: Tabla,
  id: string,
  path: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };
  const { data, error } = await supabase.from(tabla).update({ imagen: path }).eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "No se guardó: revisá tu sesión de admin." };
  revalidateTaxonomias();
  return {};
}

/** Bajada del banner de una línea ("400 g/m² · Para el uso diario"). */
export async function guardarDescripcionLinea(formData: FormData): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const id = String(formData.get("id") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim().slice(0, 140);
  const { error } = await supabase.from("lineas").update({ descripcion: descripcion || null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTaxonomias();
}
