/**
 * Dirección pública de la tienda. Acepta el valor con o sin "https://"
 * ("blanco-lina.vercel.app" también sirve) y, si falta o no es válida, usa la
 * dirección que informa Vercel; así una variable mal cargada no rompe el build.
 */
function urlDelSitio(): string {
  const candidatos = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
  for (const crudo of candidatos) {
    const v = (crudo ?? "").trim().replace(/^["']|["']$/g, "");
    if (!v) continue;
    const conEsquema = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(conEsquema);
      return `${u.protocol}//${u.host}`;
    } catch {
      console.error(`[hogar-lina] dirección del sitio inválida: "${v}"`);
    }
  }
  return "http://localhost:3000";
}

/** Datos fijos de la marca. Lo editable (contacto, condiciones) vive en site_settings. */
export const SITE = {
  nombre: "Hogar Lina",
  bajada: "Blanquería y textiles para el hogar",
  descripcion:
    "Toallas, toallones, batas, turbantes y repasadores 100% algodón. Pagá con transferencia o en cuotas sin interés y recibilo en tu casa.",
  url: urlDelSitio(),
};

/** Link al formulario oficial de Defensa del Consumidor (obligatorio en el sitio). */
export const DEFENSA_CONSUMIDOR_URL =
  "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario";
