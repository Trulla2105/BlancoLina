"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidar() {
  revalidatePath("/");
  revalidatePath("/admin/instagram");
}

/** Registra un posteo cuya imagen ya se subió a Storage desde el navegador. */
export async function registrarPost(
  imagen: string,
  link: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };
  if (!link.startsWith("https://")) {
    return { error: "El link tiene que ser la URL del post (https://…)." };
  }

  const { data: maxRow } = await supabase
    .from("instagram_posts")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("instagram_posts").insert({
    imagen,
    link: link.trim(),
    orden: (maxRow?.orden ?? -1) + 1,
  });
  if (error) return { error: error.message };
  revalidar();
  return {};
}

/** Guarda el código embed del widget de Instagram (LightWidget/Behold). */
export async function guardarInstagramEmbed(
  _prev: { error?: string; ok?: string },
  formData: FormData
): Promise<{ error?: string; ok?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };

  const html = String(formData.get("html") ?? "").trim();
  const { data, error } = await supabase
    .from("site_settings")
    .upsert({ key: "instagram_embed", value: { html }, updated_at: new Date().toISOString() })
    .select("key");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "No se pudo guardar (revisá tu sesión de admin)." };

  revalidatePath("/", "layout");
  revalidatePath("/admin/instagram");
  return { ok: html ? "Widget guardado." : "Widget quitado." };
}

export async function eliminarPost(id: string, imagen: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("instagram_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.storage.from("product-images").remove([imagen]);
  revalidar();
}
