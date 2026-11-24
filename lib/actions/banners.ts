"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidateBanners() {
  revalidatePath("/");
  revalidatePath("/admin/banners");
}

/**
 * Registra un banner cuya foto ya se subió a Storage desde el navegador
 * (subida directa: sin límite de tamaño de las functions de Vercel).
 */
export async function registrarBanner(
  path: string,
  pathMobile: string | null,
  titulo: string,
  link: string,
  subtitulo = "",
  boton = ""
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };

  if (link && !link.startsWith("/") && !link.startsWith("https://")) {
    return { error: "El link tiene que empezar con / (interno) o https://" };
  }

  const { data: maxRow } = await supabase
    .from("hero_banners")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("hero_banners").insert({
    url: path,
    url_mobile: pathMobile,
    titulo: titulo.trim() || null,
    subtitulo: subtitulo.trim() || null,
    boton: boton.trim() || null,
    link: link.trim() || null,
    orden: (maxRow?.orden ?? -1) + 1,
  });
  if (error) return { error: `No se pudo registrar el banner: ${error.message}` };

  revalidateBanners();
  return {};
}

/** Pone o reemplaza la foto de celular de un banner que ya existe. */
export async function setBannerMobile(
  id: string,
  path: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado." };
  const { data, error } = await supabase
    .from("hero_banners")
    .update({ url_mobile: path })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "No se pudo actualizar (revisá tu sesión de admin)." };
  revalidateBanners();
  return {};
}

/** Quita la foto de celular: en el teléfono vuelve a usarse la de computadora. */
export async function quitarBannerMobile(id: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase
    .from("hero_banners")
    .update({ url_mobile: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBanners();
}

export async function eliminarBanner(
  id: string,
  path: string,
  pathMobile: string | null
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { error } = await supabase.from("hero_banners").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // Las fotos de ejemplo (/seed/…) viven en el repo, no en Storage.
  const paths = (pathMobile ? [path, pathMobile] : [path]).filter(
    (p) => !p.startsWith("/") && !p.startsWith("http")
  );
  if (paths.length > 0) await supabase.storage.from("product-images").remove(paths);

  revalidateBanners();
}

export async function moverBanner(id: string, direction: "up" | "down"): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data: banners } = await supabase
    .from("hero_banners")
    .select("id, orden")
    .order("orden");
  if (!banners) return;

  const index = banners.findIndex((b) => b.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= banners.length) return;

  const a = banners[index];
  const b = banners[swapWith];
  await supabase.from("hero_banners").update({ orden: b.orden }).eq("id", a.id);
  await supabase.from("hero_banners").update({ orden: a.orden }).eq("id", b.id);

  revalidateBanners();
}

export async function alternarBannerActivo(id: string, activo: boolean): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase.from("hero_banners").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBanners();
}
