const sinDecimales = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const conDecimales = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $22.200 — y con centavos solo cuando los hay ($866,67). */
export function formatPrice(value: number): string {
  const redondeado = Math.round(value * 100) / 100;
  const abs = Math.abs(redondeado);
  const numero = Number.isInteger(abs) ? sinDecimales.format(abs) : conDecimales.format(abs);
  return `${redondeado < 0 ? "−" : ""}$${numero}`;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
