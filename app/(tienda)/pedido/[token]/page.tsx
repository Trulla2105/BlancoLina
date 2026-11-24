import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { pagarConMercadoPago } from "@/lib/actions/tienda";
import { whatsappUrl } from "@/lib/contacto";
import { formatDateTime, formatPrice } from "@/lib/format";
import { mercadoPagoHabilitado, registrarPago } from "@/lib/mercadopago";
import { getConfigContacto, getConfigTransferencia, getPedidoPublico } from "@/lib/queries";
import { ORDER_STATUS_LABEL, type PedidoPublico } from "@/lib/types";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mp?: string; payment_id?: string; collection_id?: string; status?: string }>;
};

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

export default async function PedidoPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;

  // Vuelta del checkout de Mercado Pago: se consulta el pago a la API (no se
  // confía en los parámetros de la URL) por si el webhook todavía no llegó.
  const paymentId = sp.payment_id ?? sp.collection_id;
  if (paymentId && mercadoPagoHabilitado()) {
    try {
      await registrarPago(paymentId);
    } catch (e) {
      console.error("[pedido] no se pudo consultar el pago:", e);
    }
  }

  const [pedido, transferencia, contacto] = await Promise.all([
    getPedidoPublico(token),
    getConfigTransferencia(),
    getConfigContacto(),
  ]);
  if (!pedido) notFound();

  const pendiente = pedido.estado === "pendiente_pago";
  const wa = whatsappUrl(
    contacto.whatsapp,
    `¡Hola! Te escribo por el pedido #${pedido.numero}.`
  );
  const datosBanco = [
    ["Titular", transferencia.titular],
    ["CUIT", transferencia.cuit],
    ["Banco", transferencia.banco],
    ["CBU", transferencia.cbu],
    ["Alias", transferencia.alias],
  ].filter(([, v]) => v);

  return (
    <div className="page order-page">
      <div className="order-head">
        <p className="order-kicker">Pedido #{pedido.numero}</p>
        <h1>
          {pedido.estado === "cancelado"
            ? "Este pedido fue cancelado"
            : pendiente && pedido.metodo_pago === "mercadopago"
              ? "Tu pedido está esperando el pago"
              : `¡Gracias por tu compra, ${pedido.nombre}!`}
        </h1>
        <p className="order-sub">
          {formatDateTime(pedido.created_at)} · Estado: <strong>{ORDER_STATUS_LABEL[pedido.estado]}</strong>
        </p>
        <p className="order-sub">Te mandamos el detalle a {pedido.email}. Guardá este link para seguir tu pedido.</p>
      </div>

      {pendiente && pedido.metodo_pago === "transferencia" && (
        <section className="order-box order-pay">
          <h2>Transferí {formatPrice(Number(pedido.total))} para confirmar tu pedido</h2>
          {datosBanco.length > 0 ? (
            <dl className="bank">
              {datosBanco.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>En breve te enviamos los datos para transferir.</p>
          )}
          <p className="order-note">
            Indicá el pedido #{pedido.numero} en el concepto y envianos el comprobante
            {wa ? " por WhatsApp" : contacto.email ? ` a ${contacto.email}` : ""}.
          </p>
          {wa && (
            <a href={wa} className="btn btn-solid" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={16} /> Enviar comprobante
            </a>
          )}
        </section>
      )}

      {pendiente && pedido.metodo_pago === "mercadopago" && (
        <section className="order-box order-pay">
          {sp.mp === "error" ? (
            <p className="form-error">No pudimos conectar con Mercado Pago. Probá de nuevo.</p>
          ) : pedido.mp_status === "rejected" ? (
            <p className="form-error">El pago fue rechazado. Podés intentar con otra tarjeta.</p>
          ) : pedido.mp_status === "in_process" || pedido.mp_status === "pending" ? (
            <p>Mercado Pago está procesando el pago. Te avisamos por email cuando se acredite.</p>
          ) : (
            <p>Todavía no registramos el pago.</p>
          )}
          {mercadoPagoHabilitado() && (
            <form action={pagarConMercadoPago}>
              <input type="hidden" name="token" value={pedido.token} />
              <button type="submit" className="btn btn-solid">
                Pagar {formatPrice(Number(pedido.total))} con Mercado Pago
              </button>
            </form>
          )}
        </section>
      )}

      {pedido.estado === "pagado" && (
        <section className="order-box order-ok">
          <p>
            <strong>¡Pago recibido!</strong> Ya estamos preparando tu pedido.
          </p>
        </section>
      )}

      <div className="order-grid">
        <section className="order-box">
          <h2>Detalle</h2>
          <ul className="order-items">
            {pedido.items.map((i, n) => (
              <li key={`${i.sku}-${n}`}>
                <span>
                  {i.producto}
                  <small>
                    {i.color}
                    {i.medida !== "Única" && ` · ${i.medida}`} · x{i.cantidad}
                  </small>
                </span>
                <span>{formatPrice(Number(i.precio_unitario) * i.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="sum-row">
            <span>Subtotal</span>
            <span>{formatPrice(Number(pedido.subtotal))}</span>
          </div>
          {Number(pedido.descuento) > 0 && (
            <div className="sum-row sum-discount">
              <span>Descuento transferencia ({pedido.descuento_pct}%)</span>
              <span>−{formatPrice(Number(pedido.descuento))}</span>
            </div>
          )}
          <div className="sum-row">
            <span>Envío</span>
            <span>
              {pedido.envio == null ? "A coordinar" : Number(pedido.envio) === 0 ? "Gratis" : formatPrice(Number(pedido.envio))}
            </span>
          </div>
          <div className="sum-row sum-total">
            <span>Total</span>
            <span>{formatPrice(Number(pedido.total))}</span>
          </div>
        </section>
        <section className="order-box">
          <h2>Entrega</h2>
          <p>
            {pedido.nombre} {pedido.apellido}
            <br />
            {direccion(pedido)}
            <br />
            {pedido.telefono}
          </p>
          {pedido.envio == null && (
            <p className="order-note">Te contactamos para coordinar el envío y su costo.</p>
          )}
        </section>
      </div>

      <p className="order-foot">
        <Link href="/productos">Seguir comprando</Link> · ¿Te arrepentiste?{" "}
        <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
      </p>
    </div>
  );
}
