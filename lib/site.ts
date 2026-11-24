/** Datos fijos de la marca. Lo editable (contacto, condiciones) vive en site_settings. */
export const SITE = {
  nombre: "Hogar Lina",
  bajada: "Blanquería y textiles para el hogar",
  descripcion:
    "Toallas, toallones, batas, turbantes y repasadores 100% algodón. Pagá con transferencia o en cuotas sin interés y recibilo en tu casa.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};

/** Link al formulario oficial de Defensa del Consumidor (obligatorio en el sitio). */
export const DEFENSA_CONSUMIDOR_URL =
  "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario";
