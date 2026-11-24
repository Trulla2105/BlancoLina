import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/lib/site";
import type { PedidoPublico } from "@/lib/types";

/**
 * Mercado Pago Checkout Pro, sin SDK (API REST).
 * Se activa solo si están MP_ACCESS_TOKEN y SUPABASE_SERVICE_ROLE_KEY:
 * sin la service role el webhook no podría marcar los pedidos como pagados.
 */

const API = "https://api.mercadopago.com";

function accessToken(): string {
  return (process.env.MP_ACCESS_TOKEN ?? "").trim();
}

export function mercadoPagoHabilitado(): boolean {
  return Boolean(accessToken()) && Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim());
}

async function mpFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`Mercado Pago respondió ${res.status}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }
  return json;
}

/** Crea la preferencia de pago del pedido y devuelve el link al checkout. */
export async function crearPreferencia(
  pedido: PedidoPublico,
  cuotas: number
): Promise<{ id: string; url: string }> {
  const items = pedido.items.map((i, n) => ({
    id: `${i.sku}-${n}`,
    title: `${i.producto} · ${i.color}${i.medida !== "Única" ? ` · ${i.medida}` : ""}`.slice(0, 250),
    quantity: i.cantidad,
    unit_price: Number(i.precio_unitario),
    currency_id: "ARS",
  }));
  const envio = Number(pedido.envio ?? 0);
  if (envio > 0) {
    items.push({ id: "envio", title: "Envío", quantity: 1, unit_price: envio, currency_id: "ARS" });
  }

  const vuelta = `${SITE.url}/pedido/${pedido.token}`;
  const body: Record<string, unknown> = {
    items,
    payer: { email: pedido.email, name: pedido.nombre, surname: pedido.apellido },
    external_reference: pedido.token,
    back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
    notification_url: `${SITE.url}/api/mercadopago/webhook`,
    statement_descriptor: SITE.nombre.toUpperCase().slice(0, 22),
    metadata: { numero_pedido: pedido.numero },
  };
  if (cuotas > 1) body.payment_methods = { installments: cuotas };
  // Mercado Pago solo acepta auto_return con URLs https (en local no aplica).
  if (SITE.url.startsWith("https://")) body.auto_return = "approved";

  const data = (await mpFetch("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  })) as { id?: string; init_point?: string };
  if (!data?.id || !data?.init_point) throw new Error("Mercado Pago no devolvió el link de pago.");
  return { id: data.id, url: data.init_point };
}

interface PagoMP {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
}

/**
 * Consulta el pago en Mercado Pago (la fuente de verdad) y lo registra en el
 * pedido cuyo token es external_reference. Idempotente: se puede llamar desde
 * el webhook y desde la vuelta del checkout sin pisar nada.
 */
export async function registrarPago(paymentId: string): Promise<{ ok: boolean; motivo?: string }> {
  if (!/^\d{1,30}$/.test(paymentId)) return { ok: false, motivo: "payment id inválido" };
  const admin = createAdminClient();
  if (!admin || !accessToken()) return { ok: false, motivo: "Mercado Pago no configurado" };

  const pago = (await mpFetch(`/v1/payments/${paymentId}`)) as PagoMP;
  const token = pago.external_reference ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false, motivo: "pago sin pedido asociado" };

  const { data: order, error } = await admin
    .from("orders")
    .select("id, estado, total, metodo_pago")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { ok: false, motivo: "pedido inexistente" };

  const cambios: Record<string, unknown> = {
    mp_payment_id: String(pago.id),
    mp_status: pago.status,
    mp_status_detail: pago.status_detail ?? null,
  };

  if (pago.status === "approved" && order.estado === "pendiente_pago") {
    const monto = Number(pago.transaction_amount ?? 0);
    const esperado = Number(order.total);
    if (pago.currency_id !== "ARS" || Math.abs(monto - esperado) > 1) {
      // No se marca pagado: el monto no coincide. Queda para revisar en el panel.
      cambios.mp_status_detail = `monto ${monto} ${pago.currency_id ?? ""} ≠ total ${esperado}`;
    } else {
      cambios.estado = "pagado";
      cambios.pagado_at = new Date().toISOString();
    }
  }

  const { error: upErr } = await admin.from("orders").update(cambios).eq("id", order.id);
  if (upErr) throw new Error(upErr.message);
  return { ok: true };
}

/**
 * Verifica la firma x-signature de las notificaciones (si MP_WEBHOOK_SECRET
 * está cargada). Plantilla: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
 */
export function firmaWebhookValida(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}): boolean {
  const secret = (process.env.MP_WEBHOOK_SECRET ?? "").trim();
  if (!secret) return true; // sin secreto configurado no se puede verificar
  if (!params.xSignature) return false;

  const partes = Object.fromEntries(
    params.xSignature.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    })
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(params.dataId) ? params.dataId.toLowerCase() : params.dataId;
  let manifest = `id:${id};`;
  if (params.xRequestId) manifest += `request-id:${params.xRequestId};`;
  manifest += `ts:${ts};`;

  const esperado = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
