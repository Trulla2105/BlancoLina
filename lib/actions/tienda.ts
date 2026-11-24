"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { confirmarPedidoCliente, notificarArrepentimiento, notificarNuevoPedido } from "@/lib/email";
import { crearPreferencia, mercadoPagoHabilitado } from "@/lib/mercadopago";
import {
  getConfigComercial,
  getConfigContacto,
  getConfigTransferencia,
  getPedidoPublico,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { FormState, MetodoPago } from "@/lib/types";

/** Los errores de las funciones de la base ya vienen redactados para el cliente. */
function mensajeDeError(error: { message?: string; code?: string } | null): string {
  const msg = error?.message ?? "";
  if (error?.code === "P0001" && msg) return msg;
  return "No pudimos procesar el pedido. Probá de nuevo en unos minutos.";
}

export async function suscribirNewsletter(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "La tienda todavía no está conectada a la base de datos." };
  const email = String(formData.get("email") ?? "").trim();
  const { error } = await supabase.rpc("suscribir_newsletter", { p_email: email });
  if (error) return { error: error.code === "P0001" ? error.message : "No pudimos suscribirte." };
  return { ok: "¡Listo! Te vas a enterar de las promociones." };
}

export interface ArrepentimientoState extends FormState {
  codigo?: string;
}

export async function solicitarArrepentimiento(
  _prev: ArrepentimientoState,
  formData: FormData
): Promise<ArrepentimientoState> {
  const supabase = await createClient();
  if (!supabase) return { error: "La tienda todavía no está conectada a la base de datos." };
  const datos = {
    nombre: String(formData.get("nombre") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    telefono: String(formData.get("telefono") ?? "").trim(),
    dni: String(formData.get("dni") ?? "").trim(),
    numero_pedido: String(formData.get("numero_pedido") ?? "").trim(),
    motivo: String(formData.get("motivo") ?? "").trim(),
  };
  const { data, error } = await supabase.rpc("solicitar_arrepentimiento", { p_datos: datos });
  if (error || !data) {
    return { error: error?.code === "P0001" ? error.message : "No pudimos registrar la solicitud." };
  }
  const codigo = String(data);
  await notificarArrepentimiento({ codigo, ...datos });
  revalidatePath("/admin/arrepentimientos");
  return { ok: "Solicitud registrada.", codigo };
}

export interface CheckoutInput {
  items: { variantId: string; cantidad: number }[];
  cliente: { email: string; nombre: string; apellido: string; telefono: string; dni: string };
  entrega: {
    tipo: "domicilio" | "retiro";
    calle?: string;
    altura?: string;
    piso_depto?: string;
    codigo_postal?: string;
    localidad?: string;
    provincia?: string;
    notas?: string;
  };
  metodo: MetodoPago;
}

export interface CheckoutResult {
  error?: string;
  /** adónde mandar al cliente: el checkout de Mercado Pago o su pedido */
  url?: string;
}

/**
 * Crea el pedido: la base valida stock y calcula precios, descuento y envío
 * (crear_pedido). Con Mercado Pago, además crea la preferencia de pago.
 */
export async function crearPedido(input: CheckoutInput): Promise<CheckoutResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "La tienda todavía no está conectada a la base de datos." };

  if (input.metodo === "mercadopago" && !mercadoPagoHabilitado()) {
    return { error: "El pago con Mercado Pago no está disponible. Elegí transferencia." };
  }

  const { data, error } = await supabase.rpc("crear_pedido", {
    p_items: input.items.map((i) => ({ variant_id: i.variantId, cantidad: i.cantidad })),
    p_cliente: input.cliente,
    p_entrega: input.entrega,
    p_metodo: input.metodo,
  });
  if (error || !data) return { error: mensajeDeError(error) };

  const { token } = data as { token: string };
  const [pedido, transferencia, contacto, cfg] = await Promise.all([
    getPedidoPublico(token),
    getConfigTransferencia(),
    getConfigContacto(),
    getConfigComercial(),
  ]);

  if (pedido) {
    await Promise.all([
      notificarNuevoPedido(pedido),
      confirmarPedidoCliente(pedido, transferencia, contacto),
    ]);
  }
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");

  if (input.metodo === "mercadopago" && pedido) {
    try {
      const pref = await crearPreferencia(pedido, cfg.cuotas);
      await supabase.rpc("registrar_preferencia_mp", {
        p_token: token,
        p_preference_id: pref.id,
      });
      return { url: pref.url };
    } catch (e) {
      console.error("[checkout] no se pudo crear la preferencia de Mercado Pago:", e);
      // El pedido ya existe: desde su página se puede reintentar el pago.
      return { url: `/pedido/${token}?mp=error` };
    }
  }

  return { url: `/pedido/${token}` };
}

/** Reintento del pago con Mercado Pago desde la página del pedido. */
export async function pagarConMercadoPago(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const pedido = await getPedidoPublico(token);
  if (!supabase || !pedido || !mercadoPagoHabilitado()) redirect(`/pedido/${token}?mp=error`);
  if (pedido.metodo_pago !== "mercadopago" || pedido.estado !== "pendiente_pago") {
    redirect(`/pedido/${token}`);
  }

  let url: string;
  try {
    const cfg = await getConfigComercial();
    const pref = await crearPreferencia(pedido, cfg.cuotas);
    await supabase.rpc("registrar_preferencia_mp", { p_token: token, p_preference_id: pref.id });
    url = pref.url;
  } catch (e) {
    console.error("[pedido] reintento de pago:", e);
    redirect(`/pedido/${token}?mp=error`);
  }
  redirect(url);
}

export interface EstadoVariante {
  id: string;
  precio: number;
  stock: number;
}

/**
 * Precio y stock actuales de las variantes del carrito (el carrito guarda
 * los valores del momento en que se agregó). Las que no vuelven ya no están
 * a la venta (producto desactivado o borrado).
 */
export async function estadoVariantes(ids: string[]): Promise<EstadoVariante[]> {
  const validos = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 60);
  if (validos.length === 0) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("product_variants")
    .select("id, precio, precio_oferta, stock")
    .in("id", validos);
  return (data ?? []).map((v) => ({
    id: v.id as string,
    precio: Number(v.precio_oferta ?? v.precio),
    stock: Number(v.stock),
  }));
}
