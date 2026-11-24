import type { ConfigComercial, Product, ProductVariant } from "@/lib/types";

/**
 * Cálculos de precio que se muestran en el sitio. La base hace las mismas
 * cuentas al crear el pedido (crear_pedido en 0003_funciones.sql): si se
 * cambia una regla acá, hay que cambiarla también allá.
 */

/** Precio que se cobra por la variante: la oferta si la tiene. */
export function precioVariante(v: Pick<ProductVariant, "precio" | "precio_oferta">): number {
  return v.precio_oferta ?? v.precio;
}

/** Precio pagando por transferencia (descuento sobre el precio final). */
export function precioTransferencia(precio: number, cfg: ConfigComercial): number {
  if (!cfg.transferencia_pct) return precio;
  return precio - Math.round((precio * cfg.transferencia_pct) / 100);
}

/** Valor de cada cuota sin interés. */
export function valorCuota(precio: number, cfg: ConfigComercial): number {
  return cfg.cuotas > 1 ? precio / cfg.cuotas : precio;
}

/** Precio sin impuestos nacionales (IVA 21% incluido en el precio de venta). */
export function precioSinImpuestos(precio: number): number {
  return precio / 1.21;
}

export function tieneEnvioGratis(monto: number, cfg: ConfigComercial): boolean {
  return cfg.envio_gratis_desde != null && monto >= cfg.envio_gratis_desde;
}

/** Porcentaje de descuento de una oferta, redondeado. */
export function porcentajeOferta(precio: number, oferta: number | null): number | null {
  if (oferta == null || oferta >= precio) return null;
  return Math.round(((precio - oferta) / precio) * 100);
}

/**
 * Resumen de precios de un producto para la tarjeta: el precio más bajo de
 * las variantes con stock (o de todas si no queda ninguna), si hay variantes
 * con precio distinto ("Desde") y la oferta de esa variante.
 */
export function resumenPrecio(product: Product): {
  precio: number | null; // lo que se cobra (oferta si hay)
  precioLista: number | null; // precio sin oferta (para tacharlo)
  desde: boolean;
  descuentoPct: number | null;
  stockTotal: number;
} {
  const variantes = product.product_colors.flatMap((c) => c.product_variants);
  const stockTotal = variantes.reduce((s, v) => s + v.stock, 0);
  const candidatas = variantes.filter((v) => v.stock > 0);
  const base = candidatas.length > 0 ? candidatas : variantes;
  if (base.length === 0) {
    return { precio: null, precioLista: null, desde: false, descuentoPct: null, stockTotal };
  }
  let mejor = base[0];
  for (const v of base) if (precioVariante(v) < precioVariante(mejor)) mejor = v;
  const distintos = new Set(base.map((v) => precioVariante(v))).size > 1;
  return {
    precio: precioVariante(mejor),
    precioLista: mejor.precio_oferta != null ? mejor.precio : null,
    desde: distintos,
    descuentoPct: porcentajeOferta(mejor.precio, mejor.precio_oferta),
    stockTotal,
  };
}
