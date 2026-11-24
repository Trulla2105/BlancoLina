import Link from "next/link";
import { cambiarEstadoPedido } from "@/lib/actions/pedidos";
import { whatsappUrl } from "@/lib/contacto";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getOrders } from "@/lib/queries";
import {
  METODO_PAGO_LABEL,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  type Order,
  type OrderStatus,
} from "@/lib/types";

const MP_STATUS: Record<string, string> = {
  approved: "aprobado",
  pending: "pendiente",
  in_process: "en proceso",
  rejected: "rechazado",
  cancelled: "cancelado",
  refunded: "devuelto",
  charged_back: "contracargo",
};

function direccion(o: Order): string {
  if (o.entrega === "retiro") return "Retira en el local";
  return [
    [o.calle, o.altura].filter(Boolean).join(" "),
    o.piso_depto,
    [o.codigo_postal, o.localidad].filter(Boolean).join(" "),
    o.provincia,
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const filtro = ORDER_STATUSES.includes(estado as OrderStatus) ? (estado as OrderStatus) : undefined;
  const orders = await getOrders({ estado: filtro });

  return (
    <>
      <h1>Pedidos</h1>
      <div className="admin-filters">
        <Link href="/admin/pedidos" className={!filtro ? "active" : undefined}>
          Todos
        </Link>
        {ORDER_STATUSES.map((e) => (
          <Link key={e} href={`/admin/pedidos?estado=${e}`} className={filtro === e ? "active" : undefined}>
            {ORDER_STATUS_LABEL[e]}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty-note">No hay pedidos {filtro ? "en ese estado" : "todavía"}.</div>
      ) : (
        <div className="orders-list">
          {orders.map((o) => {
            const items = o.order_items ?? [];
            const unidades = items.reduce((s, it) => s + it.cantidad, 0);
            const wa = whatsappUrl(o.telefono, `Hola ${o.nombre}, te escribimos de la tienda por tu pedido #${o.numero}.`);
            return (
              <details key={o.id} className="order-card" open={o.estado === "pendiente_pago" || o.estado === "pagado"}>
                <summary>
                  <span className="oc-date">
                    #{o.numero} · {formatDateTime(o.created_at)}
                  </span>
                  <span className="oc-cliente">
                    {o.nombre} {o.apellido}
                  </span>
                  <span className="oc-total">{formatPrice(Number(o.total))}</span>
                  <span className={`badge ${o.estado}`}>{ORDER_STATUS_LABEL[o.estado]}</span>
                </summary>

                <div className="order-detail">
                  <div className="oc-contacto">
                    <span>Email: {o.email}</span>
                    <span>
                      Tel.:{" "}
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer">
                          {o.telefono}
                        </a>
                      ) : (
                        o.telefono
                      )}
                    </span>
                    <span>DNI/CUIT: {o.dni}</span>
                    <span>Entrega: {direccion(o)}</span>
                    {o.notas && <span>Notas: {o.notas}</span>}
                    <span>
                      Pago: {METODO_PAGO_LABEL[o.metodo_pago]}
                      {o.metodo_pago === "mercadopago" &&
                        ` · MP: ${o.mp_status ? MP_STATUS[o.mp_status] ?? o.mp_status : "sin pago"}${o.mp_payment_id ? ` (#${o.mp_payment_id})` : ""}${o.mp_status_detail ? ` · ${o.mp_status_detail}` : ""}`}
                    </span>
                  </div>

                  <div className="table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Color</th>
                          <th>Medida</th>
                          <th>Cant.</th>
                          <th>Unit.</th>
                          <th>Subt.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td>
                              {it.producto} <span className="oc-sku">{it.sku}</span>
                            </td>
                            <td>{it.color}</td>
                            <td>{it.medida}</td>
                            <td>{it.cantidad}</td>
                            <td>{formatPrice(Number(it.precio_unitario))}</td>
                            <td>{formatPrice(Number(it.precio_unitario) * it.cantidad)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="oc-footer">
                    <span className="oc-resumen">
                      {unidades} unidad{unidades === 1 ? "" : "es"} · Subtotal {formatPrice(Number(o.subtotal))}
                      {Number(o.descuento) > 0 && ` · Desc. ${o.descuento_pct}% −${formatPrice(Number(o.descuento))}`}
                      {" · Envío "}
                      {o.envio == null ? "a coordinar" : Number(o.envio) === 0 ? "gratis" : formatPrice(Number(o.envio))}
                      {" — "}
                      <strong>{formatPrice(Number(o.total))}</strong>
                    </span>
                    {o.estado === "cancelado" ? (
                      <span className="oc-cancelado">Cancelado (el stock volvió al catálogo)</span>
                    ) : (
                      <form action={cambiarEstadoPedido} className="actions">
                        <input type="hidden" name="id" value={o.id} />
                        <select name="estado" defaultValue={o.estado}>
                          {ORDER_STATUSES.map((e) => (
                            <option key={e} value={e}>
                              {ORDER_STATUS_LABEL[e]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn-sm">
                          Guardar estado
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="oc-link">
                    Link del cliente: <Link href={`/pedido/${o.token}`}>/pedido/{o.token.slice(0, 8)}…</Link>
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}
