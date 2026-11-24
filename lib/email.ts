/**
 * Envío de emails vía Resend (https://resend.com).
 * Si no está configurada RESEND_API_KEY no se envía nada y el sitio funciona
 * igual. Avisos a la tienda → HOGAR_NOTIF_EMAIL; al cliente → su email.
 */

import { formatPrice } from "@/lib/format";
import { SITE } from "@/lib/site";
import {
  METODO_PAGO_LABEL,
  ORDER_STATUS_LABEL,
  type ConfigContacto,
  type ConfigTransferencia,
  type OrderStatus,
  type PedidoPublico,
} from "@/lib/types";

const C = {
  ink: "#1b1b1b",
  accent: "#7a1f2b",
  off: "#f6f5f3",
  line: "#e6e4e0",
  gray: "#6b6b6b",
  paper: "#ffffff",
};

function esc(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(opts: {
  preheader?: string;
  titulo: string;
  intro?: string;
  contenido?: string;
  botonTexto?: string;
  botonUrl?: string;
}): string {
  const boton =
    opts.botonTexto && opts.botonUrl
      ? `<p style="margin:24px 0 4px"><a href="${opts.botonUrl}" style="display:inline-block;background:${C.ink};color:#fff;text-decoration:none;padding:13px 26px;border-radius:10px;font-size:14px">${esc(opts.botonTexto)}</a></p>`
      : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.off}">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.off};padding:28px 12px;font-family:Arial,Helvetica,sans-serif">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.paper};border:1px solid ${C.line}">
<tr><td style="padding:26px 20px;text-align:center;border-bottom:1px solid ${C.line}">
  <div style="font-size:24px;font-weight:300;letter-spacing:8px;color:${C.ink}">${esc(SITE.nombre.toUpperCase())}</div>
  <div style="font-size:10px;letter-spacing:4px;color:${C.gray};margin-top:4px">BLANQUERÍA</div>
</td></tr>
<tr><td style="height:4px;background:${C.accent};line-height:4px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:30px 32px;color:${C.ink}">
  <h1 style="margin:0 0 8px;font-size:20px;font-weight:400">${esc(opts.titulo)}</h1>
  ${opts.intro ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:${C.gray}">${opts.intro}</p>` : ""}
  ${opts.contenido ?? ""}
  ${boton}
</td></tr>
<tr><td style="border-top:1px solid ${C.line};background:${C.off};padding:18px 32px;font-size:12px;line-height:1.6;color:${C.gray}">
  ${esc(SITE.nombre)} · ${esc(SITE.bajada)}<br><a href="${SITE.url}" style="color:${C.gray}">${esc(SITE.url.replace(/^https?:\/\//, ""))}</a>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.EMAIL_FROM ?? `${SITE.nombre} <onboarding@resend.dev>`;
  const to = params.to
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (to.length === 0) return;

  const body: Record<string, unknown> = { from, to, subject: params.subject, html: params.html };
  if (params.replyTo) body.reply_to = params.replyTo;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("[email] Resend respondió", res.status, await res.text());
  } catch (error) {
    // Un mail que no sale no debe romper la compra.
    console.error("[email] no se pudo enviar:", error);
  }
}

function tablaItems(p: PedidoPublico): string {
  const filas = p.items
    .map(
      (i) => `<tr>
  <td style="padding:8px 0;border-bottom:1px solid ${C.line};font-size:13.5px">${esc(i.producto)}<br><span style="color:${C.gray};font-size:12px">${esc(i.color)}${i.medida !== "Única" ? ` · ${esc(i.medida)}` : ""} · x${i.cantidad}</span></td>
  <td style="padding:8px 0;border-bottom:1px solid ${C.line};font-size:13.5px;text-align:right;white-space:nowrap">${formatPrice(Number(i.precio_unitario) * i.cantidad)}</td>
</tr>`
    )
    .join("");
  const linea = (label: string, valor: string, fuerte = false) =>
    `<tr><td style="padding:5px 0;font-size:13.5px;${fuerte ? "font-weight:700" : `color:${C.gray}`}">${label}</td><td style="padding:5px 0;font-size:13.5px;text-align:right;${fuerte ? "font-weight:700" : ""}">${valor}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}
${linea("Subtotal", formatPrice(Number(p.subtotal)))}
${Number(p.descuento) > 0 ? linea(`Descuento transferencia (${p.descuento_pct}%)`, `−${formatPrice(Number(p.descuento))}`) : ""}
${linea("Envío", p.envio == null ? "A coordinar" : Number(p.envio) === 0 ? "Gratis" : formatPrice(Number(p.envio)))}
${linea("Total", formatPrice(Number(p.total)), true)}
</table>`;
}

function direccion(p: PedidoPublico): string {
  if (p.entrega === "retiro") return "Retiro en el local";
  return [
    [p.calle, p.altura].filter(Boolean).join(" "),
    p.piso_depto,
    [p.codigo_postal, p.localidad].filter(Boolean).join(" "),
    p.provincia,
  ]
    .filter(Boolean)
    .join(", ");
}

function bloqueTransferencia(t: ConfigTransferencia, p: PedidoPublico): string {
  const filas = [
    ["Titular", t.titular],
    ["CUIT", t.cuit],
    ["Banco", t.banco],
    ["CBU", t.cbu],
    ["Alias", t.alias],
  ].filter(([, v]) => v);
  if (filas.length === 0) {
    return `<p style="font-size:14px;line-height:1.6">Te vamos a enviar los datos para transferir. Monto: <strong>${formatPrice(Number(p.total))}</strong>.</p>`;
  }
  return `<div style="background:${C.off};border:1px solid ${C.line};padding:14px 16px;margin:8px 0 18px;font-size:13.5px;line-height:1.7">
  <strong>Transferí ${formatPrice(Number(p.total))}</strong> a:<br>
  ${filas.map(([k, v]) => `${k}: <strong>${esc(v)}</strong>`).join("<br>")}<br>
  <span style="color:${C.gray}">Indicá el pedido #${p.numero} en el concepto y mandanos el comprobante.</span>
</div>`;
}

export async function notificarNuevoPedido(p: PedidoPublico): Promise<void> {
  const to = process.env.HOGAR_NOTIF_EMAIL;
  if (!to) return;
  await sendEmail({
    to,
    replyTo: p.email,
    subject: `Nuevo pedido #${p.numero} — ${formatPrice(Number(p.total))} (${METODO_PAGO_LABEL[p.metodo_pago]})`,
    html: layout({
      preheader: `${p.nombre} ${p.apellido} · ${formatPrice(Number(p.total))}`,
      titulo: `Nuevo pedido #${p.numero}`,
      intro: `${esc(p.nombre)} ${esc(p.apellido)} · ${esc(p.email)} · ${esc(p.telefono)}<br>Pago: ${METODO_PAGO_LABEL[p.metodo_pago]} · Entrega: ${esc(direccion(p))}`,
      contenido: tablaItems(p),
      botonTexto: "Ver en el panel",
      botonUrl: `${SITE.url}/admin/pedidos`,
    }),
  });
}

export async function confirmarPedidoCliente(
  p: PedidoPublico,
  transferencia: ConfigTransferencia,
  contacto: ConfigContacto
): Promise<void> {
  const link = `${SITE.url}/pedido/${p.token}`;
  const pago =
    p.metodo_pago === "transferencia"
      ? bloqueTransferencia(transferencia, p)
      : `<p style="font-size:14px;line-height:1.6">Si todavía no completaste el pago con Mercado Pago, podés hacerlo desde el link de tu pedido.</p>`;
  await sendEmail({
    to: p.email,
    replyTo: contacto.email || undefined,
    subject: `Recibimos tu pedido #${p.numero} — ${SITE.nombre}`,
    html: layout({
      preheader: `Pedido #${p.numero} por ${formatPrice(Number(p.total))}`,
      titulo: `¡Gracias por tu compra, ${esc(p.nombre)}!`,
      intro: `Tu pedido #${p.numero} quedó registrado. Entrega: ${esc(direccion(p))}.`,
      contenido: pago + tablaItems(p),
      botonTexto: "Ver mi pedido",
      botonUrl: link,
    }),
  });
}

export async function notificarEstadoPedido(params: {
  email: string;
  nombre: string;
  numero: number;
  token: string;
  estado: OrderStatus;
}): Promise<void> {
  const textos: Partial<Record<OrderStatus, string>> = {
    pagado: "Recibimos el pago. Ya estamos preparando tu pedido.",
    enviado: "Tu pedido está en camino.",
    entregado: "Tu pedido fue entregado. ¡Que lo disfrutes!",
    cancelado: "Tu pedido fue cancelado. Si no lo pediste vos, escribinos.",
  };
  const texto = textos[params.estado];
  if (!texto) return;
  await sendEmail({
    to: params.email,
    subject: `Pedido #${params.numero}: ${ORDER_STATUS_LABEL[params.estado]} — ${SITE.nombre}`,
    html: layout({
      titulo: `Pedido #${params.numero}: ${ORDER_STATUS_LABEL[params.estado]}`,
      intro: `Hola ${esc(params.nombre)}. ${texto}`,
      botonTexto: "Ver mi pedido",
      botonUrl: `${SITE.url}/pedido/${params.token}`,
    }),
  });
}

export async function notificarArrepentimiento(a: {
  codigo: string;
  nombre: string;
  email: string;
  numero_pedido?: string;
  motivo?: string;
}): Promise<void> {
  const detalle = `<p style="font-size:14px;line-height:1.7">Código: <strong>${esc(a.codigo)}</strong><br>Pedido: ${esc(a.numero_pedido || "—")}<br>${a.motivo ? `Motivo: ${esc(a.motivo)}` : ""}</p>`;
  await sendEmail({
    to: a.email,
    subject: `Recibimos tu solicitud de arrepentimiento (${a.codigo}) — ${SITE.nombre}`,
    html: layout({
      titulo: "Recibimos tu solicitud de arrepentimiento",
      intro: `Hola ${esc(a.nombre)}. Registramos tu pedido de revocación de compra. Te vamos a contactar para coordinar la devolución.`,
      contenido: detalle,
    }),
  });
  const tienda = process.env.HOGAR_NOTIF_EMAIL;
  if (tienda) {
    await sendEmail({
      to: tienda,
      replyTo: a.email,
      subject: `Botón de arrepentimiento: ${a.codigo} (${a.nombre})`,
      html: layout({
        titulo: "Nueva solicitud de arrepentimiento",
        intro: `${esc(a.nombre)} · ${esc(a.email)}`,
        contenido: detalle,
        botonTexto: "Ver en el panel",
        botonUrl: `${SITE.url}/admin/arrepentimientos`,
      }),
    });
  }
}
