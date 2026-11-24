/** Limpia valores pegados con comillas, espacios o saltos de línea. */
function sanitize(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

/**
 * Devuelve la config de Supabase solo si es usable; null si falta o es
 * inválida (placeholders, URL malformada), para que el sitio renderice
 * sin datos en vez de tirar un error 500.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL no es una URL válida; el sitio corre sin conexión a Supabase."
    );
    return null;
  }
  return { url, anonKey };
}

/**
 * URL pública de una imagen: path del bucket product-images, o passthrough si
 * ya es absoluta o es un archivo del repo (/seed/… en public/).
 */
export function publicImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  const env = getSupabaseEnv();
  if (!env) return path;
  return `${env.url}/storage/v1/object/public/product-images/${path}`;
}
