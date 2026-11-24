"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Comprime la imagen en el navegador antes de subirla: la redimensiona a
 * maxDim px en su lado mayor y la convierte a JPEG. Una foto de celular de
 * 8 MB queda en ~300-500 KB, así la subida es mucho más rápida.
 * Si algo falla (formato raro, navegador viejo) se sube el original.
 */
async function compressImage(file: File, maxDim: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));

    // Ya es chica y liviana: no vale la pena recomprimir
    if (scale === 1 && file.size < 600_000) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Fondo blanco por si el original tiene transparencia (JPEG no la soporta)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/**
 * Sube archivos directo del navegador a Supabase Storage (bucket
 * product-images). No pasa por Vercel, así que no hay límite de 4,5 MB
 * por request. Devuelve los paths subidos y los errores por archivo.
 */
export async function uploadImages(
  files: File[],
  prefix: string,
  onProgress?: (done: number, total: number) => void,
  maxDim = 1600
): Promise<{ paths: string[]; errors: string[] }> {
  const supabase = createClient();
  if (!supabase) return { paths: [], errors: ["Supabase no está configurado."] };

  const paths: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length);

    if (!file.type.startsWith("image/")) {
      errors.push(`${file.name}: no es una imagen.`);
      continue;
    }

    const compressed = await compressImage(file, maxDim);
    const isJpeg = compressed !== file;
    const ext = isJpeg
      ? "jpg"
      : file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${prefix}/${Date.now()}-${i}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, compressed, {
        contentType: isJpeg ? "image/jpeg" : file.type,
      });

    if (error) {
      errors.push(`${file.name}: ${error.message}`);
    } else {
      paths.push(path);
    }
  }

  onProgress?.(files.length, files.length);
  return { paths, errors };
}
