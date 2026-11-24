/** Link de WhatsApp a partir del número cargado en el panel ("+54 9 11 …"). */
export function whatsappUrl(numero: string, texto?: string): string | null {
  const digits = (numero ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const q = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${digits}${q}`;
}

/** Acepta "@cuenta", "cuenta" o la URL completa. */
export function instagramUrl(valor: string): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://www.instagram.com/${v.replace(/^@/, "")}/`;
}

/** URL y "@usuario" para mostrar (null si no hay cuenta cargada). */
export function perfilInstagram(valor: string): { url: string; usuario: string } | null {
  const url = instagramUrl(valor);
  if (!url) return null;
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  return { url, usuario: m ? `@${m[1]}` : "Instagram" };
}
