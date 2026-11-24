import { NextResponse, type NextRequest } from "next/server";
import { firmaWebhookValida, mercadoPagoHabilitado, registrarPago } from "@/lib/mercadopago";

/**
 * Notificaciones de Mercado Pago (webhooks e IPN).
 * No se confía en el cuerpo: se toma el id del pago y se consulta a la API de
 * Mercado Pago con nuestro access token; recién ahí se actualiza el pedido.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!mercadoPagoHabilitado()) {
    return NextResponse.json({ ok: false, motivo: "mercadopago-sin-configurar" }, { status: 200 });
  }

  const url = request.nextUrl;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // IPN puede venir sin cuerpo: los datos están en la URL
  }

  const tipo = String(url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type ?? body.topic ?? "");
  const data = (body.data ?? {}) as { id?: string | number };
  const dataId = String(url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? data.id ?? "");

  if (tipo !== "payment" || !dataId) {
    // merchant_order u otros avisos: no hacen falta, se responde 200 para que no reintente.
    return NextResponse.json({ ok: true, ignorado: tipo || "sin-tipo" });
  }

  if (
    !firmaWebhookValida({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    })
  ) {
    return NextResponse.json({ ok: false, motivo: "firma-invalida" }, { status: 401 });
  }

  try {
    const r = await registrarPago(dataId);
    return NextResponse.json(r);
  } catch (error) {
    console.error("[mercadopago] webhook:", error);
    // 500: Mercado Pago reintenta más tarde.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
