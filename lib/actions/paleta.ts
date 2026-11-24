"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function crearColorPaleta(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const hex = String(formData.get("hex") ?? "").trim();
  if (!nombre) return { error: "Escribí el nombre del color." };
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return { error: "Elegí un color válido." };

  const { data: maxRow } = await supabase
    .from("palette_colors")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("palette_colors").insert({
    nombre,
    hex,
    orden: (maxRow?.orden ?? -1) + 1,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: "Color agregado a la paleta." };
}

export async function eliminarColorPaleta(id: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("palette_colors").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}
